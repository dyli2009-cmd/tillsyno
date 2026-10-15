const {chromium}=require('playwright');
const {PDFDocument,degrees}=require('../vendor/pdf-lib.min.js');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {execFileSync}=require('node:child_process'),root=path.join(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 if(file===path.join(root,'auth/client.js')){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:(a,m)=>!m||a.modules.includes(m)};");}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch(e){res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:1024,height:900},acceptDownloads:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const drawing=await PDFDocument.create();drawing.addPage([600,800]);drawing.addPage([900,700]).setRotation(degrees(90));const bytes=Buffer.from(await drawing.save());
  await page.goto('http://127.0.0.1:'+server.address().port+'/controlflow-revision-test/all-in-one.html');
  await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').first().click();await page.locator('input[value="automation"]').check();await page.locator('#allProtocolApply').click();
  await page.evaluate(async b64=>{const file=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'Service DA Test Östra.PDF',{type:'application/pdf'});await $('securityFile').onchange({target:{files:[file],value:''}});},bytes.toString('base64'));
  await page.evaluate(()=>{
   project={...emptyProject(),sourceFileName:project.sourceFileName,agreement:'OLD-CONTRACT-999',projectName:'Testanlaggning',facilityNo:'6183943',order:'6183943',company:'Servicebolaget',customer:'Kundbolaget',date:'2026-10-15',nextDate:'2027-10-15'};
   items=[normalize({uid:'report-test-auto',type:'automation',id:'543210-9-24-1',idMode:'manual',serialNumber:'1',modelCode:'24',page:2,number:1,x:.2,y:.3,labelX:.4,labelY:.3,checks:{}})];
   items[0].checks['1.1']={result:'remark',note:'Samtal med nyttjaren.'};items[0].checks['1.2']={result:'na',note:''};selected=items[0].uid;AllInOneProtocols.set(['automation']);syncProjectInputs();save();drawMarkers();showSelected();go('protocol');
  });
  await page.evaluate(()=>go('project'));
  assert.equal(await page.locator('#secTechnician').isVisible(),false);
  assert.equal(await page.locator('#secAgreement').inputValue(),'');assert.equal(await page.locator('#secOrder').evaluate(e=>e.closest('label').textContent),'Ordernummer');assert.equal(await page.locator('#secAgreement').evaluate(e=>e.closest('label').textContent),'AO-nummer');
  for(const id of ['secPostalCity','secCompanyPostalCity'])assert.equal(await page.locator('#'+id).evaluate(e=>e.closest('label').textContent),'Ort');
  assert.equal(await page.evaluate(()=>securityPdfName()),'Service DA Test Östra.PDF');
  await page.locator('#secSignature').fill('AA');assert.equal(await page.evaluate(()=>project.signature),'AA');
  await page.locator('#revisionSignDraw').click();
  const pad=await page.locator('#revisionSignatureCanvas').boundingBox();
  await page.mouse.move(pad.x+pad.width*.15,pad.y+pad.height*.7);await page.mouse.down();
  for(let i=0;i<30;i++)await page.mouse.move(pad.x+pad.width*(.15+i*.02),pad.y+pad.height*(.5+Math.sin(i*.5)*.25));
  await page.mouse.up();await page.locator('#revisionSignatureSave').click();
  const sign=await page.evaluate(()=>({image:project.signatureImage,w:project.signatureWidth,h:project.signatureHeight}));assert(sign.image.startsWith('data:image/png;base64,'));assert(sign.w>sign.h);assert.equal(await page.evaluate(()=>loadSaved(activeKey).project.signatureImage),sign.image);
  await page.evaluate(()=>go('protocol'));assert.equal(await page.locator('#revisionProtocolSignaturePreview').isVisible(),true);assert.equal(await page.locator('#secProtocolSignature').isVisible(),false);
  const report=await page.evaluate(()=>{const doc=reportDoc();return {bytes:Array.from(new Uint8Array(doc.output('arraybuffer'))),map:doc.__protocolPages,links:doc.__backLinks};});
  const qa=process.env.QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'customer-v9-'));fs.mkdirSync(qa,{recursive:true});const pdf=path.join(qa,'customer-v9.pdf');fs.writeFileSync(pdf,Buffer.from(report.bytes));
  const checks=execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python',['-c',`
import fitz,sys,json
d=fitz.open(sys.argv[1]);p=d[1]
spans=[s for b in p.get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans']]
def matches(value):return [s for s in spans if s['text'].strip()==value]
assert matches('CHECKLISTA REVISION AV DÖRRAUTOMATIK')
assert matches('Tillbaka till ritningen')
for value in ['Testanlaggning','6183943','Servicebolaget','Kundbolaget']:
 found=matches(value);assert found,value
 assert all('bold' not in s['font'].lower() for s in found),(value,found)
assert matches('543210-9-24-1') and all('bold' in s['font'].lower() for s in matches('543210-9-24-1'))
clip=fitz.Rect(132/25.4*72,89/25.4*72,198/25.4*72,97/25.4*72)
ao=p.get_text(clip=clip).strip();assert ao=='AO-nummer:',repr(ao)
assert p.get_text().count('Postnummer / Ort:')==2
assert 'Postadress' not in p.get_text()
assert 'ORDERNUMMER' in d[0].get_text() and '6183943' in d[0].get_text()
assert 'OLD-CONTRACT-999' not in p.get_text()
notes=p.get_text().split('ALLMÄN INFO / ANMÄRKNING')[-1];assert '1.1 Samtal med nyttjaren.' in notes and '1.1 –' not in notes
strokes=[q for q in p.get_drawings() if abs(q['width']-.22/25.4*72)<.02 and any(i[0]=='l' and abs(i[1].y-i[2].y)<.01 and abs(abs(i[1].x-i[2].x)-2.8/25.4*72)<.02 for i in q['items'])];assert len(strokes)==1
images=p.get_image_info();assert len(images)==18,len(images)
assert all(0<i['bbox'][2]-i['bbox'][0]<=16/25.4*72 for i in images)
p.get_pixmap(matrix=fitz.Matrix(1.6,1.6)).save(sys.argv[2])
print('PASS actual PDF text/font/geometry: correct title, normal project values, bold ID, blank AO and visible return action.')
`,pdf,path.join(qa,'customer-v9-page.png')],{encoding:'utf8'});process.stdout.write(checks);
  assert.equal(report.links[0].drawingPage,2);assert(report.links[0].rect[2]>=40&&report.links[0].rect[3]>=7);
  await page.evaluate(()=>openCustomerPreview());
  await page.waitForFunction(()=>$('secPreviewDialog').open&&$('secPreviewCanvas').width>0);
  const bounds=await page.locator('#secPreviewCanvas').boundingBox(),[x,y,w,h]=report.links[0].rect;
  await page.mouse.click(bounds.x+(x+w/2)/210*bounds.width,bounds.y+(y+h/2)/297*bounds.height);
  await page.waitForFunction(()=>!$('secPreviewDialog').open&&document.body.dataset.view==='drawing');assert.equal(await page.evaluate(()=>page),2);
  const event=page.waitForEvent('download');await page.locator('#securityExport').click();await page.locator('#secSaveWork').click();const downloaded=await event;assert.equal(downloaded.suggestedFilename(),'Service DA Test Östra.PDF');const work=fs.readFileSync(await downloaded.path());
  const exported=path.join(qa,'customer-v9-work.pdf');fs.writeFileSync(exported,work);
  process.stdout.write(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python',['-c',`
import fitz,sys
d=fitz.open(sys.argv[1]);spans=[s for b in d[1].get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans']]
a=[s for s in spans if s['text']=='543210-9-24-1'];assert len(a)==1,a
assert abs(a[0]['size']-14)<.01,a
print('PASS exported automation label font is reduced to 14 pt.')
`,exported],{encoding:'utf8'}));
  const inspection=await page.evaluate(async b64=>{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const result=await inspectSecurityWorkPdf(bytes);const d=await PDFLib.PDFDocument.load(bytes),page=d.getPages().at(-1),arr=page.node.lookup(PDFLib.PDFName.of('Annots'),PDFLib.PDFArray);let found=false;for(const ref of arr.asArray()){const a=d.context.lookup(ref);const dest=a.get(PDFLib.PDFName.of('Dest'));if(dest){const target=d.context.lookup(dest).get(0);if(String(target)===String(d.getPages()[1].ref))found=true;}}return {sourceName:result.work.project.sourceFileName,ao:result.work.project.aoNumber,agreement:result.work.project.agreement,signature:result.work.project.signatureImage,mode:result.work.project.signatureMode,order:result.work.project.order,x:result.work.items[0].x,y:result.work.items[0].y,backLink:found};},work.toString('base64'));
  assert.equal(inspection.sourceName,'Service DA Test Östra.PDF');assert.equal(inspection.ao,'');assert.equal(inspection.agreement,'OLD-CONTRACT-999');assert.equal(inspection.signature,sign.image);assert.equal(inspection.mode,'hand');assert.equal(inspection.order,'6183943');assert.equal(inspection.x,.2);assert.equal(inspection.y,.3);assert(inspection.backLink);
  await page.locator('#securityExport').click();await page.locator('#secSaveNew').click();assert.equal(await page.locator('#secNewFileName').inputValue(),'Service DA Test Östra.PDF');const namedEvent=page.waitForEvent('download');await page.locator('#secFileNameDialog [type=submit]').click();assert.equal((await namedEvent).suggestedFilename(),'Service DA Test Östra.PDF');console.log('PASS both save actions preserve the opened Unicode filename and extension case.');
  await page.reload();await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').first().click();await page.locator('input[value="automation"]').check();await page.locator('#allProtocolApply').click();
  await page.evaluate(async b64=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'saved-work.pdf',{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});},work.toString('base64'));
  await page.locator('#secOpenContinue').click();assert.equal(await page.evaluate(()=>securityPdfName()),'saved-work.pdf');assert.equal(await page.evaluate(()=>project.signatureImage),sign.image);
  await page.evaluate(()=>go('project'));assert.equal(await page.locator('#revisionSignaturePreview').isVisible(),true);
  await page.locator('#revisionSignText').click();assert.equal(await page.evaluate(()=>project.signatureMode),'text');
  const textPdf=await page.evaluate(()=>Array.from(new Uint8Array(reportDoc().output('arraybuffer'))));fs.writeFileSync(path.join(qa,'text-signature.pdf'),Buffer.from(textPdf));
  process.stdout.write(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python',['-c',"import fitz,sys;d=fitz.open(sys.argv[1]);assert d[1].get_text().count('AA')==18;assert not d[1].get_image_info();assert all(s['color']==0x3b82c4 for b in d[1].get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans'] if s['text']=='AA');print('PASS text signature replaces handwriting in every row in pen blue.')",path.join(qa,'text-signature.pdf')],{encoding:'utf8'}));
  await page.locator('#secAgreement').fill('AO-123');assert.equal(await page.evaluate(()=>project.aoNumber),'AO-123');assert.equal(await page.evaluate(()=>project.order),'6183943');
  const manualPdf=await page.evaluate(()=>Array.from(new Uint8Array(reportDoc().output('arraybuffer'))));fs.writeFileSync(path.join(qa,'manual-ao.pdf'),Buffer.from(manualPdf));process.stdout.write(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python',['-c',"import fitz,sys;d=fitz.open(sys.argv[1]);assert 'AO-123' in d[1].get_text();assert 'OLD-CONTRACT-999' not in d[1].get_text();print('PASS explicit AO is separate from order and historical agreement.')",path.join(qa,'manual-ao.pdf')],{encoding:'utf8'}));
  await page.locator('#revisionSignDraw').click();await page.locator('#revisionSignatureCancel').click();assert.equal(await page.evaluate(()=>project.signatureMode),'text');
  await page.setViewportSize({width:390,height:844});await page.locator('#revisionSignDraw').click();const mobile=await page.locator('#revisionSignatureDialog').boundingBox();assert(mobile.x>=0&&mobile.x+mobile.width<=390);if(process.env.QA_DIR)await page.screenshot({path:path.join(qa,'signature-mobile.png')});await page.locator('#revisionSignatureCancel').click();
  await page.locator('#revisionSignRemove').click();assert.equal(await page.evaluate(()=>project.signatureImage),'');assert.equal(await page.evaluate(()=>project.signature),'');
  await page.evaluate(()=>{project.signatureImage='data:image/png;base64,old';project.signatureMode='hand';startNewSecurityService(false)});assert.equal(await page.evaluate(()=>project.signatureImage),'');assert.equal(await page.evaluate(()=>project.aoNumber),'');assert.equal(await page.evaluate(()=>securityPdfName()),'saved-work.pdf');
  console.log('PASS handwriting/text selection, project/PDF round-trip, cancel/remove, mobile layout and new-service reset.');

  const migrated=await page.evaluate(async image=>{
   const old=await new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.src=image;});
   const c=document.createElement('canvas');c.width=old.naturalWidth;c.height=old.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(old,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle='#23495e';ctx.fillRect(0,0,c.width,c.height);
   project.signatureImage=c.toDataURL();project.signatureInk='';project.signatureMode='hand';await RevisionSignature.prepare();
   const fresh=await new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.src=project.signatureImage;});ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(fresh,0,0);
   const data=ctx.getImageData(0,0,c.width,c.height).data;let color;for(let i=0;i<data.length;i+=4)if(data[i+3]===255){color=Array.from(data.slice(i,i+3));break;}
   return {ink:project.signatureInk,color,width:fresh.naturalWidth,height:fresh.naturalHeight};
  },sign.image);assert.equal(migrated.ink,'#3b82c4');assert.deepEqual(migrated.color,[59,130,196]);assert.equal(migrated.width,sign.w);assert.equal(migrated.height,sign.h);
  console.log('PASS saved dark signature becomes pen blue with original shape/dimensions.');
  await page.evaluate(()=>{
   items.push(normalize({uid:'long-test',type:'automation',id:'LONGOBJECT-57617-14-24-2',idMode:'manual',modelCode:'24',serialNumber:'2',number:2,page:2,x:.6,y:.55,labelX:.5,labelY:.7,checks:{}}));
   items.push(normalize({uid:'first-page',type:'automation',id:'FIRST-24-1',idMode:'manual',modelCode:'24',serialNumber:'1',number:3,page:1,x:.2,y:.3,labelX:.5,labelY:.4,checks:{}}));
   items.push(normalize({uid:'filtered',type:'alarm',id:'Hidden alarm',number:3,page:2,x:.1,y:.1,labelX:.2,labelY:.2,checks:{}}));
   items[0].checks['1.1'].result='remark';
   textNotes=[{page:2,text:'Preview note',x:.15,y:.8,labelX:.25,labelY:.8}];
   drawingExtras=[{uid:'tool',type:'text',page:2,x:.7,y:.4,text:'Tool text'}];
   selected=items[0].uid;save();go('drawing');
  });
  const next=page.waitForEvent('download');await page.locator('#securityExport').click();await page.locator('#secSaveWork').click();const previewWork=fs.readFileSync(await (await next).path());
  fs.writeFileSync(path.join(qa,'preview-work.pdf'),previewWork);process.stdout.write(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python',['-c',"import fitz,sys;d=fitz.open(sys.argv[1]);s=[s for b in d[1].get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans'] if s['text']=='LONGOBJECT-57617-14-24-2'];assert len(s)==1 and abs(s[0]['size']-12)<.01;print('PASS long drawing ID uses reduced 12 pt font.')",path.join(qa,'preview-work.pdf')],{encoding:'utf8'}));
  for(const [width,height,drawingPage] of [[1024,900,1],[1024,900,2],[390,844,2]]){
   await page.setViewportSize({width,height});
   await page.evaluate(async n=>{page=n;go('drawing');await render(true);await openCustomerPreview();},drawingPage);
   const result=await page.evaluate(async ({b64,n})=>{
    const expected=await pdfjsLib.getDocument({data:Uint8Array.from(atob(b64),c=>c.charCodeAt(0))}).promise,p=await expected.getPage(n),cv=$('secPreviewCanvas'),natural=p.getViewport({scale:1}),dpr=Math.min(Math.max(2.5,(devicePixelRatio||1)*1.6),4),scale=parseFloat(cv.style.width)/natural.width;
    const compare=document.createElement('canvas');compare.width=cv.width;compare.height=cv.height;await p.render({canvasContext:compare.getContext('2d'),viewport:p.getViewport({scale:scale*dpr})}).promise;
    const text=(await (await previewPdf.getPage(n)).getTextContent()).items.map(t=>t.str).join(' ');
    const a=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,b=compare.getContext('2d').getImageData(0,0,compare.width,compare.height).data;let different=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])different++;
    const image=cv.toDataURL();await expected.destroy();return {different,text,image};
   },{b64:previewWork.toString('base64'),n:drawingPage});
   assert.equal(result.different,0,'Actual preview canvas must match downloaded PDF pixels');
   if(drawingPage===2){assert(result.text.includes('LONGOBJECT-57617-14-24-2'));assert(result.text.includes('Preview note'));assert(result.text.includes('Tool text'));assert(!result.text.includes('Inbrottslarm'));}
   else assert(result.text.includes('FIRST-24-1'));
   if(process.env.QA_DIR)fs.writeFileSync(path.join(qa,'preview-'+width+'-page-'+drawingPage+'.png'),Buffer.from(result.image.split(',')[1],'base64'));
   await page.locator('#secPreviewClose').click();
  }
  console.log('PASS actual preview pixels equal downloaded PDF: regular and rotated drawing, short/long IDs, notes, drawing tools, selected protocols and phone.');

  assert((await page.locator('[data-ta-version-footer]').textContent()).includes('TEST v9'));assert.deepEqual(errors,[]);
  console.log('PASS preview return click and exported PDF destination go to drawing page 2; work data/order stay intact.');await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
