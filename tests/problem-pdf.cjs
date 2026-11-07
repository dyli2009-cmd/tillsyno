const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const drawing=require('./pdf-fixture.cjs');
const fixturePdf=drawing(),fixtureHash=require('node:crypto').createHash('sha256').update(fixturePdf).digest('hex');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:850}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(hash=>{
   const fixtureProject=({projectName:'216720-27',inspectionDate:'2026-09-30',projectOrder:'6232833,00',company:'Dörrservice'});
   const fixtureDoors=[
    {uid:'one',id:'D1',page:1,status:'ok',checks:{}},
    {uid:'two',id:'D2',page:2,status:'untested',checks:{'1.11':{result:'remark',note:'Sensor fungerar inte.'}}},
    {uid:'five',id:'D5',page:1,status:'action',notes:'Justera dörrstängare.',checks:{}}
   ];const key='doorservice-drawing-v1:'+hash;if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,doors:fixtureDoors,project:fixtureProject,logoData:''}));
  },fixtureHash);
  await page.route('https://cdnjs.cloudflare.com/**',route=>{const file=new URL(route.request().url()).pathname.split('/').pop();return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(process.env.PDFJS_DIR||'/tmp',file))})});
  await page.route('https://dorrservice.test/**',route=>{const file=new URL(route.request().url()).pathname.slice(1)||'index.html';return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(path.join(__dirname,'..',file))})});
  await page.goto('https://dorrservice.test/');
  await page.locator('#file').setInputFiles({name:'test-ritning.pdf',mimeType:'application/pdf',buffer:fixturePdf});
  await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent==='Sida 1 / 2');
  await page.locator('#overviewBtn').click();
  await page.locator('[data-uid="two"] [data-field="remediationDate"]').fill('2026-10-03');
  await page.locator('[data-uid="two"] [data-field="remediationSignature"]').fill('AB');
  assert.equal(await page.locator('.overviewTable tbody tr').count(),2);
  await page.screenshot({path:path.join(__dirname,'..','table-preview.png')});
  const downloadPromise=page.waitForEvent('download');await page.locator('#overviewPdf').click();const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'anmarkningslista-dorrservice.pdf');
  const file=path.join(__dirname,'..','anmarkningslista-example.pdf');await download.saveAs(file);
  async function inspect(bytes){return page.evaluate(async data=>{
   const pdf=await pdfjsLib.getDocument({data:new Uint8Array(data)}).promise;const pages=[];
   for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);const content=await p.getTextContent();pages.push(content.items.map(item=>item.str).join(' '))}
   await pdf.destroy();return pages;
  },Array.from(bytes))}
  const pdfPages=await inspect(fs.readFileSync(file));assert.equal(pdfPages.length,1);
  const text=pdfPages.join(' ');
  for(const expected of ['ANMÄRKNINGSLISTA','216720-27','2026-09-30','6232833,00','D2','D5','Sensor fungerar inte.','2026-10-03','AB','Sida 1 av 1'])assert(text.includes(expected),expected);
  assert(!text.includes('D1'));assert(text.indexOf('D5')<text.indexOf('D2'));
  // Rasterize the actual output PDF for a visual layout check.
  await page.evaluate(async data=>{
   const pdf=await pdfjsLib.getDocument({data:new Uint8Array(data)}).promise,p=await pdf.getPage(1),v=p.getViewport({scale:1.3});
   const canvas=document.createElement('canvas');canvas.id='pdfPreview';canvas.width=v.width;canvas.height=v.height;await p.render({canvasContext:canvas.getContext('2d'),viewport:v}).promise;
   document.querySelector('#overviewDialog').close();document.body.replaceChildren(canvas);await pdf.destroy();
  },Array.from(fs.readFileSync(file)));
  await page.locator('#pdfPreview').screenshot({path:path.join(__dirname,'..','problem-pdf-preview.png')});
  // Exercise a single extremely long row and many further rows across page boundaries.
  const longPdf=await page.evaluate(()=>{
   const base=doors.find(d=>d.uid==='two');base.checks['1.11'].note='Lång anmärkning om sensor. '.repeat(900)+' SLUTMARKERING';
   for(let n=10;n<50;n++)doors.push(normalize({uid:'long'+n,id:'D'+n,page:3,status:'fail',notes:'Kontrollera låsfunktion '+n,checks:{}}));
   return Array.from(new Uint8Array(createProblemPdf().output('arraybuffer')));
  });
  const longPages=await inspect(longPdf);assert(longPages.length>3);const longText=longPages.join(' ');assert(longText.includes('SLUTMARKERING'));assert(longText.includes('D49'));
  longPages.forEach((text,i)=>{assert(text.includes('ANMÄRKNINGSLISTA'));assert(text.includes('216720-27'));assert(text.includes('Sida '+(i+1)+' av '+longPages.length))});
  assert.deepEqual(errors,[]);
  console.log('PASS: editable table, real jsPDF download, PDF metadata/faults/dates/signatures, sorting, multipage long rows, repeated headers/footers');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
