const {chromium}=require('playwright');
const {PDFDocument}=require('../vendor/pdf-lib.min.js');
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
  const drawing=await PDFDocument.create();drawing.addPage([600,800]);drawing.addPage([600,800]);const bytes=Buffer.from(await drawing.save());
  await page.goto('http://127.0.0.1:'+server.address().port+'/controlflow-revision-test/all-in-one.html');
  await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').first().click();await page.locator('input[value="automation"]').check();await page.locator('#allProtocolApply').click();
  await page.evaluate(async b64=>{const file=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'test.pdf',{type:'application/pdf'});await $('securityFile').onchange({target:{files:[file],value:''}});},bytes.toString('base64'));
  await page.evaluate(()=>{
   project={...emptyProject(),projectName:'Testanlaggning',facilityNo:'6183943',order:'6183943',company:'Servicebolaget',customer:'Kundbolaget',date:'2026-10-15',nextDate:'2027-10-15'};
   items=[normalize({uid:'report-test-auto',type:'automation',id:'543210-9-24-1',idMode:'manual',serialNumber:'1',modelCode:'24',page:2,number:1,x:.2,y:.3,labelX:.4,labelY:.3,checks:{}})];
   selected=items[0].uid;AllInOneProtocols.set(['automation']);syncProjectInputs();save();drawMarkers();showSelected();go('protocol');
  });
  const report=await page.evaluate(()=>{const doc=reportDoc();return {bytes:Array.from(new Uint8Array(doc.output('arraybuffer'))),map:doc.__protocolPages,links:doc.__backLinks};});
  const qa=process.env.QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'customer-v3-'));fs.mkdirSync(qa,{recursive:true});const pdf=path.join(qa,'customer-v3.pdf');fs.writeFileSync(pdf,Buffer.from(report.bytes));
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
ao=p.get_text(clip=clip).strip();assert ao=='AO nummer:',repr(ao)
p.get_pixmap(matrix=fitz.Matrix(1.6,1.6)).save(sys.argv[2])
print('PASS actual PDF text/font/geometry: correct title, normal project values, bold ID, blank AO and visible return action.')
`,pdf,path.join(qa,'customer-v3-page.png')],{encoding:'utf8'});process.stdout.write(checks);
  assert.equal(report.links[0].drawingPage,2);assert(report.links[0].rect[2]>=40&&report.links[0].rect[3]>=7);
  await page.evaluate(()=>openCustomerPreview());
  await page.waitForFunction(()=>$('secPreviewDialog').open&&$('secPreviewCanvas').width>0);
  const bounds=await page.locator('#secPreviewCanvas').boundingBox(),[x,y,w,h]=report.links[0].rect;
  await page.mouse.click(bounds.x+(x+w/2)/210*bounds.width,bounds.y+(y+h/2)/297*bounds.height);
  await page.waitForFunction(()=>!$('secPreviewDialog').open&&document.body.dataset.view==='drawing');assert.equal(await page.evaluate(()=>page),2);
  const event=page.waitForEvent('download');await page.locator('#securityExport').click();await page.locator('#secSaveWork').click();const work=fs.readFileSync(await (await event).path());
  const inspection=await page.evaluate(async b64=>{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const result=await inspectSecurityWorkPdf(bytes);const d=await PDFLib.PDFDocument.load(bytes),page=d.getPages().at(-1),arr=page.node.lookup(PDFLib.PDFName.of('Annots'),PDFLib.PDFArray);let found=false;for(const ref of arr.asArray()){const a=d.context.lookup(ref);const dest=a.get(PDFLib.PDFName.of('Dest'));if(dest){const target=d.context.lookup(dest).get(0);if(String(target)===String(d.getPages()[1].ref))found=true;}}return {order:result.work.project.order,x:result.work.items[0].x,y:result.work.items[0].y,backLink:found};},work.toString('base64'));
  assert.equal(inspection.order,'6183943');assert.equal(inspection.x,.2);assert.equal(inspection.y,.3);assert(inspection.backLink);
  assert((await page.locator('[data-ta-version-footer]').textContent()).includes('TEST v3'));assert.deepEqual(errors,[]);
  console.log('PASS preview return click and exported PDF destination go to drawing page 2; work data/order stay intact.');await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
