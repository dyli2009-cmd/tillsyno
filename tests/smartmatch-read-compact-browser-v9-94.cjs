'use strict';
// Generated fixtures only. The browser starts after authentication and PIN verification.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,PDFName,PDFHexString,StandardFonts,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.resolve(__dirname,'..'),entry=process.env.SMARTMATCH_ENTRY||'smartmatch-read-test.html';
const devices=[
 {name:'desktop',width:1366,height:900},
 {name:'iphone',width:390,height:844,touch:true,agent:'iPhone'},
 {name:'iphone-small',width:360,height:780,touch:true,agent:'iPhone'},
 {name:'ipad',width:820,height:1180,touch:true,agent:'iPad'},
 {name:'ipad-landscape',width:1180,height:820,touch:true,agent:'iPad'},
 {name:'desktop-phone-mode',width:1366,height:900,mode:'phone'}
].filter(device=>!process.env.SMARTMATCH_DEVICE||device.name===process.env.SMARTMATCH_DEVICE);
const codeRect={x:.08,y:.10,w:.75,h:.10};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}
});
async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),plan=doc.addPage([600,600]);
 const helper=doc.addPage([110,60]);helper.drawEllipse({x:55,y:30,xScale:54,yScale:29,color:rgb(1,.9,0)});helper.drawText('DVEL',{x:29,y:23,font,size:19});
 const appearance=doc.context.register(doc.context.flateStream(helper.getContentStream().getUnencodedContents(),{Type:'XObject',Subtype:'Form',BBox:[0,0,110,60],Resources:helper.node.Resources()}));doc.removePage(doc.getPageCount()-1);
 plan.node.addAnnot(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Stamp',Subj:PDFHexString.fromText('Generated access reader'),Rect:[145,370,255,430],F:4,AP:{N:appearance}})));
 plan.drawText('ROOM 14',{x:170,y:390,font,size:10});plan.drawText('DVEL1',{x:420,y:240,font,size:18});
 const card=doc.addPage([600,600]);card.drawText('Beslagskod: DVEL',{x:60,y:520,font,size:20});
 card.drawText('Komponent       Produkt       Lev av       Mont av',{x:45,y:420,font,size:11});card.drawText('Las              EL580         GS           GS',{x:45,y:390,font,size:11});
 return Buffer.from(await doc.save());
}
async function markCode(page,context,touch,rect=codeRect){
 await page.locator('#rtCode').click();await page.locator('#rtViewport').scrollIntoViewIfNeeded();
 const bounds=await page.locator('#rtCanvasBox').evaluate((el,r)=>{const b=el.getBoundingClientRect();return {x:b.x+r.x*b.width,y:b.y+r.y*b.height,dx:r.w*b.width,dy:r.h*b.height};},rect);
 if(touch){const c=await context.newCDPSession(page);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x,y:bounds.y,id:1}]});for(let i=1;i<=8;i++)await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bounds.x+bounds.dx*i/8,y:bounds.y+bounds.dy*i/8,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach();}
 else{await page.mouse.move(bounds.x,bounds.y);await page.mouse.down();await page.mouse.move(bounds.x+bounds.dx,bounds.y+bounds.dy,{steps:8});await page.mouse.up();}
}
async function layout(page,device,label){
 const state=await page.evaluate(()=>{
  const dialog=document.querySelector('#rtDialog[open]'),bounds=dialog?.getBoundingClientRect();
  const visible=element=>{const r=element.getBoundingClientRect(),s=getComputedStyle(element);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
  const oversized=[...(dialog||document).querySelectorAll('button,input,select')].filter(visible).filter(el=>{const b=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return b.width>innerWidth+1||b.left<(bounds?.left||0)-2||b.right>(bounds?.right||innerWidth)+2;}).map(el=>el.id||el.textContent);
  return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,dialog:bounds?{left:bounds.left,right:bounds.right,scroll:dialog.scrollWidth,client:dialog.clientWidth}:null,oversized};
 });
 assert(state.documentWidth<=state.width+1,device.name+' page overflow '+label+': '+JSON.stringify(state));
 if(state.dialog){assert(state.dialog.left>=-1&&state.dialog.right<=state.width+1,device.name+' dialog fits '+label);assert(state.dialog.scroll<=state.dialog.client+1,device.name+' dialog overflow '+label+': '+JSON.stringify(state));}
 assert.deepEqual(state.oversized,[],device.name+' controls fit '+label);
 await page.screenshot({path:path.join(root,'work/compact94-'+device.name+'-'+label+'.png')});
}
async function test(browser,device,bytes){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.touch,hasTouch:!!device.touch,userAgent:device.agent?'Mozilla/5.0 ('+device.agent+'; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1':undefined});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.route('**/smartmatch-read-access-v9-85.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.documentElement.removeAttribute('data-read-locked');document.getElementById('smReadCodeGate').hidden=true;"}));
 await context.addInitScript(mode=>{
  if(mode)localStorage.setItem('tillsyno-ui-appearance-v1',JSON.stringify({theme:'mist',device:mode}));
  window.__ocrCalls=0;window.__workCalls=0;window.__progress=[];
  window.Tesseract={async createWorker(){window.__ocrCalls++;throw Error('Native PDF fixture must not need OCR');}};
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:value=>{work={...value,read:options=>{window.__workCalls++;return value.read(options);}};}});
  new MutationObserver(()=>{
   const progress=document.getElementById('rtReadProgress');if(!progress||progress.hidden)return;
   window.__progress.push({title:document.getElementById('rtReadProgressTitle')?.textContent,value:document.getElementById('rtReadProgressMeter')?.value});
  }).observe(document,{childList:true,subtree:true,attributes:true,characterData:true});
 },device.mode||'');
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/'+entry);await layout(page,device,'home');
  await page.locator('#rtMultiFiles').setInputFiles({name:'generated-compact.pdf',mimeType:'application/pdf',buffer:bytes});await page.waitForSelector('#rtDialog[open]');
  assert.equal(await page.locator('#rtReadPhase').inputValue(),'codes');assert.equal(await page.locator('select#rtReadPhase:visible').count(),0,'no card/product mode choice');assert(!(await page.locator('#rtTable').isVisible()),'product table is deferred');
  await page.locator('#rtPage').fill('2');await page.locator('#rtPage').dispatchEvent('change');await page.waitForFunction(()=>document.getElementById('rtPage').value==='2'&&document.getElementById('rtCanvas').width>0);
  if(device.name==='desktop'){
   await markCode(page,context,false,{x:.1,y:.70,w:.5,h:.08});await page.locator('#rtDiscover').click();await page.waitForFunction(()=>!document.getElementById('rtDiscover').disabled);
   assert(await page.locator('#rtDiscover').isVisible(),'empty discovery offers retry');
   await page.locator('.rtReaderSettings > summary').click();await page.locator('#rtImageMode').selectOption('text');assert(await page.locator('#rtDiscover').isVisible(),'changing search method preserves discovery retry');await page.locator('.rtReaderSettings > summary').click();
  }
  await markCode(page,context,device.touch);await page.waitForFunction(()=>!document.getElementById('rtDiscover').disabled);await layout(page,device,'marked');
  await page.locator('#rtDiscover').click();await page.waitForFunction(()=>document.querySelector('#rtDiscoveryResults .rtPageChoice')&&!document.getElementById('rtPreview').disabled);
  await page.locator('#rtPreview').click();await page.waitForFunction(()=>!document.getElementById('rtMatchApproval').disabled);
  assert.equal(await page.locator('.rtMatchRow').count(),1,'one whole stamp code; suffix and background excluded');
  assert.equal(await page.evaluate(()=>__workCalls),0,'doorcard flow does not read products');assert((await page.evaluate(()=>__progress)).length>0,'real scan exposes progress');
  await layout(page,device,'matches');await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();await page.waitForFunction(()=>SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden);
  const result=await page.evaluate(()=>({positions:SmartMatchAppBridge.getPositions(),mapping:SmartMatchAppBridge.getDoorCardMapping(),read:SmartMatchReadTest.payload()}));assert.equal(result.positions[0].code,'DVEL');assert.equal(result.mapping.DVEL,2);assert.equal(Object.values(result.read.cards)[0].page,2);assert.equal(Object.values(result.read.cards)[0].workState,'pending');
  await layout(page,device,'workspace');
  assert(await page.locator('#exOpenExtra').isVisible(),'manual stamp linking is directly accessible in SmartMatch');
  if(device.name==='iphone-small'){
   await page.locator('#pwToolMenuButton').click();assert(await page.locator('#labDiagnoseOpen').isVisible(),'secondary reports remain accessible in the tool menu');await layout(page,device,'tools');await page.locator('#pwToolMenuButton').click();
  }
  const products=page.locator('#pwReadContinueProducts');assert(await products.isVisible(),'product action available in SmartMatch');await products.click();await page.waitForSelector('#rtDialog[open]');assert(await page.locator('#rtTable').isVisible(),'explicit later product reading remains available');await layout(page,device,'products');await page.locator('#rtCancel').click();
  assert.deepEqual(errors,[]);console.log('PASS '+device.name+': prepare → mark code '+(device.touch?'by touch':'by mouse')+' → discover → exact AP stamp match → approve → SmartMatch → products later; controls and progress fit');
 }catch(error){console.error(device.name,{errors,state:await page.evaluate(()=>({status:document.getElementById('rtStatus')?.textContent,body:document.body.innerText.slice(-1600)})).catch(()=>null)});throw error;}
 finally{await context.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const bytes=await fixture();for(const device of devices)await test(browser,device,bytes);}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
