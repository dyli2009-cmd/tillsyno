// Browser regression: rotated PDF geometry, edits, persistence, export and security arrows.
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const repo=path.resolve(__dirname,'..');
const {PDFDocument,rgb,degrees}=require(path.join(repo,'vendor/pdf-lib.min.js'));
const root=process.env.CONTROLFLOW_SCREENSHOTS||fs.mkdtempSync(path.join(os.tmpdir(),'controlflow-rotation-'));fs.mkdirSync(root,{recursive:true});
(async()=>{
 const server=require('node:http').createServer((req,res)=>{const p=repo+new URL(req.url,'http://localhost').pathname;try{res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(p))}catch(_){res.statusCode=404;res.end('Missing')}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const doc=await PDFDocument.create();for(let i=0;i<2;i++){const p=doc.addPage([600,400]);p.drawRectangle({x:60,y:260,width:60,height:60,color:rgb(1,0,0)});p.drawText('TOP LEFT',{x:55,y:330,size:20});if(i===1)p.setRotation(degrees(90));}const bytes=Buffer.from(await doc.save());fs.writeFileSync(root+'/drawing.pdf',bytes);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const device of [{name:'desktop',width:1440,height:1000},{name:'tablet',width:834,height:1194,mobile:true},{name:'phone',width:390,height:844,mobile:true},{name:'small-phone',width:320,height:740,mobile:true}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:!!device.mobile,hasTouch:!!device.mobile,serviceWorkers:'block'});
  await context.route('**/auth/client.js*',route=>route.fulfill({contentType:'application/javascript',body:"window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',email:'rotation-test@example.invalid',modules:['control']}),permitted:()=>true};"}));
  await context.route('**/vendor/supabase-2.49.10.min.js',route=>route.fulfill({contentType:'application/javascript',body:''}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(device.name,e.stack)});
  await page.goto('http://127.0.0.1:'+server.address().port+'/'+'all-in-one.html');await page.waitForTimeout(200);
  await page.evaluate(()=>{window.AllInOneProtocols?.set(['lock','alarm','access','detector']);document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  assert(await page.locator('#secRotate').isDisabled());
  await page.locator('#securityFile').setInputFiles(root+'/drawing.pdf');await page.waitForFunction(()=>document.body.classList.contains('secHasPdf')&&!document.querySelector('#secRotate').disabled);await page.evaluate(()=>renderQueue);
  await page.evaluate(()=>{items=[normalize({uid:'test-lock',type:'lock',number:1,id:'L1',page:1,x:.15,y:.275,labelX:.4,labelY:.4})];items.push(normalize({uid:'detector-test',type:'detector',number:1,id:'DET1',page:1,x:.8,y:.55,labelX:.85,labelY:.35}));items.push(normalize({uid:'test-alarm',type:'alarm',number:1,id:'I1',page:1,x:.35,y:.7,labelX:.2,labelY:.65}),normalize({uid:'test-access',type:'access',number:1,id:'P1',page:1,x:.8,y:.8,labelX:.7,labelY:.85}));textNotes=[{uid:'n1',page:1,x:.2,y:.3,labelX:.7,labelY:.65,text:'Test',targets:[{x:.2,y:.3},{x:.8,y:.8}]}];drawingExtras=[{uid:'line1',type:'line',page:1,x1:.1,y1:.1,x2:.3,y2:.3},{uid:'door1',type:'door-single',page:1,x:.6,y:.3,size:.08,angle:30},{uid:'text1',type:'text-arrow',page:1,x:.5,y:.75,targetX:.7,targetY:.5,text:'Text'}];save();drawMarkers();});
  const rotate=()=>device.mobile?page.locator('#secRotate').tap():page.locator('#secRotate').click();
  const detector=page.locator('.secTarget.detectorArrow');assert.equal(await detector.count(),1);assert.equal(await detector.locator('svg').count(),0,'detector pictogram removed');
  assert.equal(await detector.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');assert.equal(await detector.evaluate(el=>getComputedStyle(el,'::after').display),'none','no dot covers the arrowhead');assert.equal(await page.locator('.secConnector[data-uid="detector-test"]').getAttribute('marker-end'),'url(#secArrow-untested)');
  await detector.click();assert.equal(await page.evaluate(()=>cur().type),'detector');assert.equal(await page.evaluate(()=>document.body.dataset.view),'protocol');await page.evaluate(()=>{go('drawing');selected=null;drawMarkers()});
  for(const type of ['alarm','lock','access']){
   const mark=page.locator('.secMarker.'+type);await mark.click();await mark.click();
   assert.equal(await page.evaluate(()=>cur().type),type);assert.equal(await page.evaluate(()=>document.body.dataset.view),'protocol','protocol still opens for '+type);
   await page.evaluate(()=>{go('drawing');selected=null;lastObjectTap=null;drawMarkers()});
  }
  const arrowStyles=await page.locator('.secTarget.securityArrow').evaluateAll(nodes=>nodes.map(el=>({background:getComputedStyle(el).backgroundColor,before:getComputedStyle(el,'::before').display,after:getComputedStyle(el,'::after').display,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
  assert.equal(arrowStyles.length,4);for(const style of arrowStyles){assert.equal(style.background,'rgba(0, 0, 0, 0)');assert.equal(style.before,'none');assert.equal(style.after,'none');assert(style.width>=44&&style.height>=44,'44 px hit area');}
  const initial=await page.evaluate(()=>JSON.stringify({items,textNotes,drawingExtras}));
  async function check(angle){
   await page.evaluate(()=>renderQueue);
   const result=await page.evaluate(()=>{const c=document.querySelector('#secCanvas'),pix=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let sx=0,sy=0,n=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(pix[i]>200&&pix[i+1]<60&&pix[i+2]<60){sx+=x;sy+=y;n++;}}const target=document.querySelector('.secTarget');return{angle:drawingRotation(),point:rotateDrawingPoint(.15,.275),red:{x:sx/n/c.width,y:sy/n/c.height},target:{x:parseFloat(target.style.left)/100,y:parseFloat(target.style.top)/100},w:pageWidth,h:pageHeight,ratio:c.width/c.height,over:document.documentElement.scrollWidth>innerWidth+1};});
   assert.equal(result.angle,angle);for(const a of ['x','y']){assert(Math.abs(result.red[a]-result.point[a])<.004,'PDF pixels match projected point '+a);assert(Math.abs(result.target[a]-result.point[a])<1e-8,'marker matches PDF');}assert(Math.abs(result.w/result.h-result.ratio)<.01);assert(!result.over,'no page overflow');
  }
  await check(0);
  for(const angle of [90,180,270,0]){await rotate();await check(angle);assert.equal(await page.evaluate(()=>JSON.stringify({items,textNotes,drawingExtras})),initial,'rotation must not alter persisted work');}
  await rotate();await check(90);
  const button=await page.locator('#secRotate').boundingBox();assert(button.x>=0&&button.x+button.width<=device.width+1,'rotation reachable');assert(button.height>=43,'touch size');
  await page.screenshot({path:root+'/'+device.name+'.png'});
  // Drag in the rotated view and confirm inverse projection in canonical stored coordinates.
  const target=await page.locator('.secTarget').first().boundingBox();const rect=await page.locator('#secMarkers').boundingBox();const start={x:target.x+target.width/2,y:target.y+target.height/2};
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+30,start.y+25,{steps:5});await page.mouse.up();
  const pos=await page.evaluate(()=>({x:items[0].x,y:items[0].y}));assert(Math.abs(pos.x-(.15+25/rect.height))<.01,'drag inverse x');assert(Math.abs(pos.y-(.275-30/rect.width))<.01,'drag inverse y');
  // Place new marks through the actual background handler (pan and touch have their own gestures).
  await page.evaluate(()=>{addType='alarm';const r=markers.getBoundingClientRect();markers.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+r.width*.3,clientY:r.top+r.height*.6}));});
  const added=await page.evaluate(()=>items.at(-1));assert(Math.abs(added.x-.6)<.005&&Math.abs(added.y-.7)<.005);
  // Drawing-tool edits and an active text editor survive redraw and rotation.
  await page.evaluate(()=>{const line=drawingViewExtras.find(x=>x.uid==='line1');line.x1=.35;line.y1=.45;saveDrawingViewExtras();save();});
  assert.deepEqual(await page.evaluate(()=>({x:drawingExtras[0].x1,y:drawingExtras[0].y1})),{x:.45,y:.65});
  await page.locator('.serviceDrawingOverlay [data-draw-uid="text1"].drawTextHit').click();
  await page.locator('.serviceInlineTextEditor').fill('Updated');await page.evaluate(()=>drawMarkers());
  await rotate();await page.evaluate(()=>renderQueue);
  assert.equal(await page.evaluate(()=>drawingExtras.find(x=>x.uid==='text1').text),'Updated','text commits before rotating, even after redraw');
  await page.getByRole('button',{name:'Ritverktyg',exact:true}).click();await page.getByRole('button',{name:'Linje / vägg',exact:true}).click();
  const area=await page.locator('.serviceDrawingOverlay').boundingBox();
  await page.mouse.move(area.x+area.width*.2,area.y+area.height*.7);await page.mouse.down();await page.mouse.move(area.x+area.width*.4,area.y+area.height*.8,{steps:5});await page.mouse.up();
  const line=await page.evaluate(()=>drawingExtras.at(-1));assert.equal(line.type,'line');assert(Math.abs(line.x1-.8)<.01&&Math.abs(line.y1-.3)<.01&&Math.abs(line.x2-.6)<.01&&Math.abs(line.y2-.2)<.01,'new annotation stores original coordinates');
  const exported=await page.evaluate(async()=>{const original=Array.from(sourceBytes),previous=PDFLib.PDFPage.prototype.drawCircle;let pointCircles=0;PDFLib.PDFPage.prototype.drawCircle=function(options){if(options.size===2.7)pointCircles++;return previous.call(this,options)};let built;try{built=await buildSecurityDrawingPdf()}finally{PDFLib.PDFPage.prototype.drawCircle=previous}const {out,originalBytes}=built;const result=await PDFLib.PDFDocument.load(await out.save());return {pointCircles,angles:result.getPages().map(p=>p.getRotation().angle),same:JSON.stringify(original)===JSON.stringify(Array.from(originalBytes))}});
  assert.equal(exported.pointCircles,0,'PDF arrows have no covering point circles');assert.deepEqual(exported.angles,[0,90]);assert(exported.same,'export preserves original drawing');
  await rotate();await rotate();await rotate();await page.evaluate(()=>renderQueue);
  await page.locator('#secNext').click();await page.evaluate(()=>renderQueue);assert.equal(await page.evaluate(()=>drawingRotation()),0,'rotation scoped per page');
  assert((await page.evaluate(()=>pageWidth/pageHeight))<1,'native PDF orientation preserved');
  await page.locator('#secPrev').click();await page.evaluate(()=>renderQueue);assert.equal(await page.evaluate(()=>drawingRotation()),90);
  await page.reload();await page.waitForTimeout(200);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await page.locator('#securityFile').setInputFiles(root+'/drawing.pdf');await page.waitForFunction(()=>pdf&&drawingRotation()===90);await page.evaluate(()=>renderQueue);assert.equal(await page.locator('[data-rotation]').textContent(),'90°','view persisted');
  assert.deepEqual(errors,[]);console.log(device.name+' passed');await context.close();
 }
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
