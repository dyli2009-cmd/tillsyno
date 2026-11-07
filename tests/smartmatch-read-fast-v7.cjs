/* TEST 7 browser integration: selected native regions avoid OCR, responsibility
 * columns produce only GS installation work, image reading stays available and
 * the reviewed work travels inside the exported PDF. Generated documents only.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const devices=[{name:'desktop',width:1366,height:900},{name:'iphone',width:390,height:844,touch:true}].filter(device=>!process.env.SMARTMATCH_DEVICE||device.name===process.env.SMARTMATCH_DEVICE);
const metadataKeys=['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'].map(PDFName.of);
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v7.html`;
const upload=(bytes,name)=>({name,mimeType:'application/pdf',buffer:bytes});
const codeRect={x:.08,y:.08,w:.66,h:.06},tableRect={x:.06,y:.20,w:.89,h:.35};
const expectedTerms=['EL580','HOPPE'],excludedTerms=['1487','ED100','Cylinder'];
const rows=[
 ['Låshus','ASSA EL580','GS','GS'],
 ['Trycke','HOPPE','DT','GS'],
 ['Slutbleck','ASSA 1487','GS','DT'],
 ['Dörrautomatik','ED100','DT','DT'],
 ['Cylinder','-','GS','GS']
];

async function fixture(page,rasterTable=false){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),plan=doc.addPage(rasterTable?[350,350]:[9536,4768]),card=doc.addPage([595,842]);
 const positions=rasterTable?[[40,260],[190,110]]:[[650,3500],[6000,1600]],annotations=[];
 for(const [index,[x,y]]of positions.entries()){
  const size=rasterTable?18:70,width=rasterTable?75:300,height=rasterTable?30:110;
  plan.drawText('GS77',{x,y,size,font,color:rgb(.1,.3,.6)});
  annotations.push(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText('GS77'),Contents:PDFHexString.fromText(''),Rect:[x-2,y-3,x+width,y+height],F:4,NM:PDFHexString.fromText('generated-gs-'+index)})));
 }
 plan.drawText('GS771',{x:rasterTable?40:1500,y:rasterTable?45:800,size:rasterTable?18:70,font});
 plan.node.set(PDFName.of('Annots'),doc.context.obj(annotations));
 card.drawText('Beslagskod GS77',{x:60,y:750,size:20,font});
 if(rasterTable){
  const image=await page.evaluate(rows=>{
   const canvas=document.createElement('canvas');canvas.width=1060;canvas.height=540;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#111';ctx.font='26px Arial';
   const x=[12,310,630,835];
   for(const [i,label]of ['Komponent','Produkt','Levereras av','Monteras av'].entries())ctx.fillText(label,x[i],45);
   for(const [row,values]of rows.entries())for(const [col,value]of values.entries())ctx.fillText(value,x[col],120+row*80);
   return canvas.toDataURL('image/png').split(',')[1];
  },rows);
  const embedded=await doc.embedPng(Buffer.from(image,'base64'));
  card.drawImage(embedded,{x:40,y:390,width:530,height:270});
 }else{
  const columns=[40,190,350,460];
  for(const [i,label]of ['Komponent','Produkt','Levereras av','Monteras av'].entries())card.drawText(label,{x:columns[i],y:650,size:11,font});
  for(const [row,values]of rows.entries())for(const [col,value]of values.entries())card.drawText(value,{x:columns[col],y:620-row*45,size:12,font});
 }
 // A genuine raster elsewhere on the card must not turn the selected native
 // code and table into OCR jobs. The drawing also includes an unrelated image.
 const irrelevant=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=180;canvas.height=90;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ddd';ctx.fillRect(0,0,180,90);ctx.fillStyle='#111';ctx.font='16px Arial';ctx.fillText('Unrelated image',10,50);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 const logo=await doc.embedPng(Buffer.from(irrelevant,'base64'));
 card.drawImage(logo,{x:40,y:60,width:500,height:180});
 plan.drawImage(logo,rasterTable?{x:230,y:280,width:100,height:50}:{x:7000,y:100,width:2000,height:1000});
 return {bytes:Buffer.from(await doc.save()),rasterTable,name:rasterTable?'raster-gs-installation':'native-gs-installation',tableRect:rasterTable?{x:.06,y:.20,w:.91,h:.35}:tableRect};
}

async function contextFor(browser,device){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;
  window.__readCalls={capture:false,pages:{},workers:0,recognize:0};
  const record=(page,key)=>{if(!window.__readCalls.capture)return;const target=window.__readCalls.pages[page]||={getTextContent:0,getOperatorList:0,getAnnotations:0,render:0};target[key]++;};
  let pdfjs;
  Object.defineProperty(window,'pdfjsLib',{configurable:true,get:()=>pdfjs,set:value=>{
   pdfjs=new Proxy(value,{get(target,key){
    if(key!=='getDocument')return Reflect.get(target,key);
    return (...args)=>{
     const task=target.getDocument(...args);let wrappedPromise;
     return new Proxy(task,{get(task,key){
      if(key!=='promise'){const value=task[key];return typeof value==='function'?value.bind(task):value;}
      return wrappedPromise||=(task.promise.then(pdf=>{
       const pages=new Map();
       return new Proxy(pdf,{get(pdf,key){
        if(key!=='getPage'){const value=pdf[key];return typeof value==='function'?value.bind(pdf):value;}
        return async number=>{
         if(!pages.has(number)){
          const pg=await pdf.getPage(number);
          pages.set(number,new Proxy(pg,{get(pg,key){
           const value=pg[key];if(typeof value!=='function')return value;
           return (...args)=>{if(['getTextContent','getOperatorList','getAnnotations','render'].includes(key))record(number,key);return value.apply(pg,args);};
          }}));
         }
         return pages.get(number);
        };
       }});
      }));
     }});
    };
   }});
  }});
  let tesseract;
  Object.defineProperty(window,'Tesseract',{configurable:true,get:()=>tesseract,set:value=>{
   tesseract=new Proxy(value,{get(target,key){
    if(key!=='createWorker')return Reflect.get(target,key);
    return async(...args)=>{
     if(window.__readCalls.capture)window.__readCalls.workers++;
     const worker=await target.createWorker(...args);
     return new Proxy(worker,{get(target,key){
      const value=target[key];if(typeof value!=='function')return value;
      return (...args)=>{if(key==='recognize'&&window.__readCalls.capture)window.__readCalls.recognize++;return value.apply(target,args);};
     }});
    };
   }});
  }});
 });
 return context;
}
async function setRect(page,kind,rect){
 for(const [axis,label]of [['x','Vänster'],['y','Överkant'],['w','Bredd'],['h','Höjd']])await page.getByLabel(kind+' '+label,{exact:true}).evaluate((node,value)=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));},rect[axis]*100);
}
async function ready(page){await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===2&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});}
async function assertGS(page){
 const work=await page.getByLabel('Arbetsrader kort 1',{exact:true}).inputValue();
 assert.equal(work.split('\n').filter(Boolean).length,2,'only two actual GS installations become work');
 for(const term of expectedTerms)assert(work.includes(term),'GS installation includes '+term);
 for(const term of excludedTerms)assert(!work.includes(term),'DT and empty installation exclude '+term);
}
async function policyToggle(page){
 const before=await page.evaluate(()=>{const before=structuredClone(window.__readCalls);window.__readCalls.capture=true;return before;});
 await page.locator('#rtWorkPolicy').selectOption('all');
 const all=await page.getByLabel('Arbetsrader kort 1',{exact:true}).inputValue();
 for(const term of ['ED100','1487'])assert(all.includes(term),'the retained all-row method includes '+term);
 await page.locator('#rtWorkPolicy').selectOption('gs');await assertGS(page);
 const after=await page.evaluate(()=>{window.__readCalls.capture=false;return window.__readCalls;});
 assert.deepEqual(after,before,'switching work selection reuses read words without more PDF extraction, rendering or OCR');
 assert.deepEqual(await page.evaluate(()=>window.__scanModes),['auto'],'changing work selection does not scan the drawing again');
 console.log('PASS all/GS work selection reuses the prepared table without extra reading');
}
async function assertWorkTime(page,id){
 const state=await page.evaluate(id=>{
  const position=SmartMatchAppBridge.getPositions().find(position=>position.id===id),state=SmartMatchAppBridge.readWorkState(position);
  return {percent:state.percent,estimatedMinutes:state.estimatedMinutes,doneMinutes:state.doneMinutes};
 },id);
 assert.deepEqual(state,{percent:67,estimatedMinutes:30,doneMinutes:20},'GS progress uses the existing weighted time rules for Låshus 20 min / Trycke 10 min');
 assert.match(await page.locator('#pwProtocolPercent').textContent(),/^67% arbete$/,'dialog and main weighted percentage agree');
}
async function read(page,input,mode){
 await page.goto(url());
 await page.evaluate(()=>{
  const matcher=SmartMatchReadMatcher;window.__scanModes=[];
  window.SmartMatchReadMatcher={...matcher,scan:options=>{window.__scanModes.push(options.imageMode);return matcher.scan(options);}};
 });
 await page.locator('#pwFile').setInputFiles(upload(input.bytes,input.name+'.pdf'));
 await page.waitForSelector('#rtDialog[open]');
 assert.equal(await page.locator('#rtImageMode').inputValue(),'auto','stamp-first remains the initial search method');
 assert.equal(await page.locator('#rtWorkPolicy').inputValue(),'gs','new cards default to GS installation work');
 await setRect(page,'Kod',codeRect);await setRect(page,'Tabell',input.tableRect);
 await page.locator('#rtImageMode').selectOption(mode);
 // Preview painting happened before these counters. Count only actual card
 // reading and matching after the user's marked regions are ready.
 await page.evaluate(()=>{window.__readCalls={capture:true,pages:{},workers:0,recognize:0};});
 const started=Date.now();await page.locator('#rtPreview').click();
 await page.waitForFunction(()=>!document.getElementById('rtPreview').disabled,null,{timeout:180000});
 const calls=await page.evaluate(()=>{window.__readCalls.capture=false;return window.__readCalls;});
 assert.equal(await page.getByLabel('Beteckning kort 1',{exact:true}).inputValue(),'GS77','the selected code is read correctly');
 await assertGS(page);
 assert.equal(await page.locator('.rtMatchRow').count(),2,'both doors match without truncating GS771');
 assert.deepEqual(await page.evaluate(()=>window.__scanModes),[mode],'the selected mode also reaches drawing matching');
 if(mode!=='full'){
  assert.equal(calls.workers,0,'native selected regions do not start a local OCR worker');
  assert.equal(calls.recognize,0,'native selected regions need zero OCR calls');
  assert.equal(calls.pages['2']?.render||0,0,'reading native marked code/table does not rasterize the card');
  if(mode==='text')for(const counts of Object.values(calls.pages)){
   assert.equal(counts.getOperatorList,0,'strict text never inspects raster operators');
   assert.equal(counts.render,0,'strict text never renders a search canvas');
  }
 }else{
  assert(calls.workers>0&&calls.recognize>0,'explicit image mode still runs real local OCR');
  assert(calls.pages['2']?.render>0,'raster work is read from a selected card crop');
  assert(calls.pages['1']?.render>0,'explicit image mode still examines drawing images');
 }
 console.log('PASS '+input.name+' '+mode+': GS installation selection, '+(Date.now()-started)+' ms; '+JSON.stringify(calls));
 return calls;
}

async function exportAndReopen(browser,device,page){
 await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await ready(page);
 const data=await page.evaluate(()=>SmartMatchReadTest.payload()),card=Object.values(data.cards)[0];
 assert.equal(card.workPolicy,'gs-install-v1','the saved card records its GS policy');assert.equal(card.work.length,2);
 const positions=await page.evaluate(()=>SmartMatchAppBridge.getPositions());
 await page.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),positions[0].id);
 await page.waitForSelector('#pwProtocol[open]');
 assert.equal(await page.locator('.rtWorkRow input').count(),2,'the protocol offers only GS installation checks');
 const displayed=(await page.locator('.rtWorkRow').allTextContents()).join(' ');
 for(const term of expectedTerms)assert(displayed.includes(term),'the work dialog displays the selected product '+term);
 await page.locator('.rtWorkRow input').first().check();
 await page.waitForFunction(()=>document.getElementById('pwProtocolPercent').textContent==='67% arbete');
 await assertWorkTime(page,positions[0].id);await page.locator('#pwProtocolClose').click();
 await page.locator('#smartPdfInspect').click();await page.waitForSelector('#smartExportDialog[open]');
 const downloading=page.waitForEvent('download',{timeout:90000});await page.locator('#smartExportBuild').click();
 const download=await downloading,exported=fs.readFileSync(await download.path()),pdf=await PDFDocument.load(exported);
 const raw=metadataKeys.map(key=>pdf.catalog.get(key)).find(Boolean);assert(raw?.decodeText,'project PDF embeds its state');
 const saved=JSON.parse(raw.decodeText()),expected=saved.readTestData;
 assert.equal(saved.instances[positions[0].id].progress,67,'the exported project retains weighted progress');
 assert.equal(Object.values(expected.checks||{}).flatMap(Object.values).filter(Boolean).length,1,'the exported project contains the completed GS job');
 const fresh=await contextFor(browser,device),opened=await fresh.newPage();
 try{
  await opened.goto(url());
  await opened.evaluate(()=>{
   window.__guideCalls=0;const show=HTMLDialogElement.prototype.showModal;
   HTMLDialogElement.prototype.showModal=function(){if(this.id==='rtDialog')window.__guideCalls++;return show.call(this);};
   const matcher=SmartMatchReadMatcher;window.SmartMatchReadMatcher={...matcher,scan:()=>{throw Error('A reviewed project PDF must open without new scanning');}};
  });
  await opened.locator('#pwFile').setInputFiles(upload(exported,'reviewed-gs-project.pdf'));await ready(opened);
  assert.equal(await opened.evaluate(()=>window.__guideCalls),0,'fresh direct PDF opening skips the guide');
  const restored=await opened.evaluate(()=>SmartMatchReadTest.payload());
  assert.deepEqual(restored.cards,expected.cards,'the GS policy, selected region and filtered rows travel inside the PDF');
  assert.equal(Object.values(restored.checks||{}).flatMap(Object.values).filter(Boolean).length,1);
  await opened.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),positions[0].id);
  await opened.waitForSelector('#pwProtocol[open]');
  assert.equal(await opened.locator('.rtWorkRow input').count(),2);assert(await opened.locator('.rtWorkRow input').first().isChecked(),'the restored GS check remains visible');
  await assertWorkTime(opened,positions[0].id);
  await opened.locator('#pwProtocolClose').click();
  await opened.evaluate(id=>SmartMatchAppBridge.openPosition(SmartMatchAppBridge.getPositions().find(position=>position.id===id)),positions[1].id);
  await opened.waitForSelector('#pwProtocol[open]');assert.equal(await opened.locator('.rtWorkRow input').first().isChecked(),false,'each physical door keeps its own GS work status');
  console.log('PASS '+device.name+': GS-filtered work, exported project and direct fresh open without scanning');
 }finally{await fresh.close();}
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
  const creatorContext=await contextFor(browser,{width:1366,height:900}),creator=await creatorContext.newPage();await creator.goto(url());const native=await fixture(creator),mixed=await fixture(creator,true);await creatorContext.close();
  for(const device of devices){
   for(const mode of ['text','auto']){
    const context=await contextFor(browser,device),page=await context.newPage(),errors=[],remote=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(request.url()))remote.push(request.url());});
    try{
     await read(page,native,mode);if(mode==='text')await exportAndReopen(browser,device,page);
     if(mode==='auto'&&device.name==='desktop')await policyToggle(page);
     assert.deepEqual(errors,[]);assert.deepEqual(remote,[],'all reading uses local project assets');
    }catch(error){console.error('Browser state:',await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,state:document.getElementById('pwState')?.textContent,work:[...document.querySelectorAll('.rtResult textarea')].map(node=>node.value),calls:window.__readCalls})).catch(()=>null));throw error;}
    finally{await context.close();}
   }
   if(device.name==='desktop'){
    const context=await contextFor(browser,device),page=await context.newPage();
    try{await read(page,mixed,'full');}finally{await context.close();}
   }
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
