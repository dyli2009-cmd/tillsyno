/* Real UI/OCR regression: native table cells survive incomplete OCR, while
 * image-only cells/rows and fully scanned cards remain readable. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {PDFDocument,StandardFonts,rgb}=require('../vendor/pdf-lib.min.js');
const root=path.resolve(__dirname,'..');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
 catch(_){res.writeHead(404);res.end();}
});
async function textImage(page,lines,width=1600,height=620,font=64){
 return Buffer.from(await page.evaluate(({lines,width,height,font})=>{
  const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,width,height);x.fillStyle='#111111';x.font=font+'px Arial';
  lines.forEach((line,i)=>x.fillText(line,20,85+i*120));return c.toDataURL('image/png').split(',')[1];
 },{lines,width,height,font}),'base64');
}
async function fixture(page,kind){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),plan=pdf.addPage([612,792]);
 const code=kind==='mixed'?'140C':'271B';plan.drawText(code,{x:100,y:600,size:20,font});
 const card=pdf.addPage([612,792]);
 if(kind==='mixed'){
  card.drawText('Dorrkort 140C',{x:72,y:700,size:18,font});
  for(const [y,text]of [[620,'Las EL580'],[582,'Glas'],[506,'Handtag HOPPE'],[468,'Automatik ED100']])card.drawText(text,{x:72,y,size:18,font});
  const product=await pdf.embedPng(await textImage(page,['GS SAKERHETSGLAS'],1200,130,64));card.drawImage(product,{x:275,y:572,width:285,height:30.875});
  const row=await pdf.embedPng(await textImage(page,['Sensor BEA IXIO'],1500,130,64));card.drawImage(row,{x:68,y:534,width:355,height:30.767});
  for(const y of [645,607,569,531,493,455])card.drawLine({start:{x:65,y},end:{x:565,y},thickness:.7,color:rgb(.5,.5,.5)});
  for(const x of [65,265,565])card.drawLine({start:{x,y:455},end:{x,y:645},thickness:.7,color:rgb(.5,.5,.5)});
 }else{
  const heading=await pdf.embedPng(await textImage(page,['Dorrkort 271B'],1200,130,76));card.drawImage(heading,{x:68,y:690,width:320,height:34.667});
  const table=await pdf.embedPng(await textImage(page,['Las ASSA EL580','Glas GS SAKERHETSGLAS','Handtag HOPPE','Automatik ED100'],1600,500,64));
  card.drawImage(table,{x:68,y:450,width:480,height:150});
 }
 return {code,bytes:Buffer.from(await pdf.save())};
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
  for(const kind of ['mixed','raster'].filter(kind=>!process.env.SMARTMATCH_TABLE_KIND||kind===process.env.SMARTMATCH_TABLE_KIND)){
   const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[],remote=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(r.url()))remote.push(r.url());});
   await context.route('**/auth/guard.js*',r=>r.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
   try{
    await page.goto('http://127.0.0.1:'+server.address().port+'/smartmatch-read-test-v3.html');
    await page.addScriptTag({url:'/vendor/tesseract/tesseract.min.js'});
    await page.evaluate(()=>{
     window.__tableOcrDimensions=[];window.__tableOcrTrace=[];window.__tableOcrParams=[];const original=Tesseract.createWorker;
     Tesseract.createWorker=async(...args)=>{const worker=await original(...args),recognize=worker.recognize,setParameters=worker.setParameters;worker.setParameters=async params=>{__tableOcrParams.push(params);return setParameters(params);};worker.recognize=async(canvas,...rest)=>{__tableOcrDimensions.push({w:canvas.width,h:canvas.height});window.__tableOcrLastImage=canvas.toDataURL('image/png');const result=await recognize(canvas,...rest);__tableOcrTrace.push({text:result.data.text,words:(result.data.words||[]).map(w=>({text:w.text,confidence:w.confidence,bbox:w.bbox}))});return result;};return worker;};
    });
    const file=await fixture(page,kind);await page.locator('#pwFile').setInputFiles({name:kind+'-table.pdf',mimeType:'application/pdf',buffer:file.bytes});await page.waitForSelector('#rtDialog[open]');
    assert.equal(await page.locator('#rtPage').inputValue(),'2');
    async function mark(kind,r){
     await page.locator('#rt'+kind).click();await page.locator('#rtCanvasBox').scrollIntoViewIfNeeded();const b=await page.locator('#rtCanvasBox').boundingBox();
     await page.mouse.move(b.x+b.width*r.x,b.y+b.height*r.y);await page.mouse.down();await page.mouse.move(b.x+b.width*(r.x+r.w),b.y+b.height*(r.y+r.h),{steps:6});await page.mouse.up();
    }
    await mark('Code',{x:.105,y:.078,w:.72,h:.066});await mark('Table',{x:.10,y:.18,w:.83,h:.26});
    await page.locator('#rtPreview').click();await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:120000});
    assert.match(await page.locator('#rtStatus').textContent(),/Sökningen är klar/);
    assert.equal(await page.getByLabel('Beteckning sida 2',{exact:true}).inputValue(),file.code);
    const work=await page.getByLabel('Arbetsrader sida 2',{exact:true}).inputValue(),rows=work.split('\n').map(s=>s.trim()).filter(Boolean),upper=work.toUpperCase();
    for(const term of ['EL580','SAKERHETSGLAS','HOPPE','ED100',...(kind==='mixed'?['IXIO']:[])])assert.equal(upper.split(term).length-1,1,kind+' keeps '+term+' exactly once: '+work);
    assert.equal(rows.length,kind==='mixed'?5:4,kind+' retains one work row per source row: '+work);
    assert(rows.some(r=>/GLAS/i.test(r)&&/GS/i.test(r)&&/SAKERHETSGLAS/i.test(r)),'native label and image-only product form one work row: '+work);
    assert.equal(await page.locator('.rtMatchRow').count(),1,'the card remains usable for a drawing link');
    const sizes=await page.evaluate(()=>__tableOcrDimensions);assert(sizes.length>=2,'real OCR reads heading and table');assert(sizes.every(s=>s.w*s.h<=2805000),'OCR canvases stay within the configured memory bound');
    assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'all processing and OCR assets remain local');
    console.log('PASS '+kind+': '+rows.length+' complete, unique work rows, code '+file.code+', local bounded OCR');
   }catch(e){console.error('Table browser state:',JSON.stringify(await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,work:document.querySelector('#rtResults textarea')?.value,ocr:window.__tableOcrTrace,params:window.__tableOcrParams})).catch(()=>null)));if(process.env.SMARTMATCH_QA_DIR){fs.mkdirSync(process.env.SMARTMATCH_QA_DIR,{recursive:true});const png=await page.evaluate(()=>window.__tableOcrLastImage?.split(',')[1]);if(png)fs.writeFileSync(path.join(process.env.SMARTMATCH_QA_DIR,kind+'-table-ocr.png'),Buffer.from(png,'base64'));}throw e;}
   finally{await context.close();}
  }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
