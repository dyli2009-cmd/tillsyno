const {chromium}=require('playwright');
const {PDFDocument,rgb}=require('../vendor/pdf-lib.min.js');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.join(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,new URL(req.url,'http://localhost').pathname.slice(1)||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch(_){res.writeHead(404);res.end()}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 try{
  const pdf=await PDFDocument.create(),p=pdf.addPage([900,600]);
  p.drawRectangle({x:80,y:80,width:700,height:400,color:rgb(.2,.2,.2)});pdf.addPage([900,600]);
  const bytes=Buffer.from(await pdf.save());
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:900},hasTouch:mobile,isMobile:mobile,acceptDownloads:true});
   // Keep authentication outside this local drawing-navigation regression.
   await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/drawing-tools.html');
   assert(await page.locator('#savePdf').isDisabled());
   await page.locator('#toolFile').setInputFiles({name:'navigation.pdf',mimeType:'application/pdf',buffer:bytes});
   await page.waitForFunction(()=>document.querySelector('#previewCanvas').width>0&&document.querySelector('#toolMessage').textContent.includes('Ritningen är klar'));
   const canvas=page.locator('#previewCanvas'),wrap=page.locator('#previewWrap');
   assert(await page.locator('#undoDrawing').isDisabled());assert(await page.locator('#redoDrawing').isDisabled());
   assert(await page.locator('#toolPanel').isHidden(),'tools hidden for drawing-first workspace');
   assert(await page.locator('header #savePdf').isVisible(),'save stays at the top');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'workspace fits screen without horizontal overflow');
   if(process.env.DRAWING_QA_DIR)await page.screenshot({path:path.join(process.env.DRAWING_QA_DIR,(mobile?'mobile':'desktop')+'-drawing.png')});
   const tools=async(section)=>{
    if(await page.locator('#toolPanel').isHidden())await page.locator('#toolsToggle').click();
    const summary=page.locator('#toolPanel summary').filter({hasText:section});
    if(await summary.locator('..').getAttribute('open')===null)await summary.click();
   };
   await wrap.scrollIntoViewIfNeeded();
   const before=await canvas.boundingBox();
   const anchor={x:before.x+before.width*.6,y:before.y+before.height*.6};
   await page.mouse.move(anchor.x,anchor.y);await page.mouse.wheel(0,-220);
   await page.waitForFunction(()=>document.querySelector('#previewZoomLevel').textContent!=='100%');
   const after=await canvas.boundingBox();assert(after.width>before.width*1.5);
   assert(Math.abs(after.x+after.width*.6-anchor.x)<3,'wheel keeps drawing point under pointer');
   // A page that still fits vertically stays centered; its scroll position is clamped.
   if(after.height+24>await wrap.evaluate(el=>el.clientHeight))assert(Math.abs(after.y+after.height*.6-anchor.y)<3,'wheel keeps vertical anchor');
   if(!mobile){
    const r=await wrap.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-90,y-65,{steps:8});await page.mouse.up();
    assert(await wrap.evaluate(el=>el.scrollLeft>50&&el.scrollTop>40),'left mouse drag pans both axes');
    await tools('Dölj eller beskär');await page.locator('#eraseMode').click();
    assert(await page.locator('#toolPanel').isHidden(),'tool selection returns to drawing');
    const initial=await wrap.evaluate(el=>el.scrollLeft);
    await page.mouse.move(x,y);await page.mouse.down({button:'middle'});await page.mouse.move(x+40,y,{steps:4});await page.mouse.up({button:'middle'});
    assert((await wrap.evaluate(el=>el.scrollLeft))<initial,'middle mouse pans while erasing');
    await page.locator('#previewEditMode').click();
   }
   await tools('Vy');
   const font=await page.locator('#toolPanel summary').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
   await page.locator('[data-app-text-larger]').click();
   assert(await page.locator('#toolPanel summary').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))>font);
   await page.locator('#previewFit').click();assert.equal(await page.locator('#previewZoomLevel').textContent(),'100%');
   assert.equal(await wrap.evaluate(el=>el.scrollLeft+el.scrollTop),0);
   await page.locator('#previewZoomIn').click();assert.equal(await page.locator('#previewZoomLevel').textContent(),'125%');
   if(process.env.DRAWING_QA_DIR)await page.screenshot({path:path.join(process.env.DRAWING_QA_DIR,(mobile?'mobile':'desktop')+'-tools.png')});
   await page.locator('#closeTools').click();
   await page.locator('#nextPage').click();await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent.includes('Sida 2'));
   assert.equal(await page.locator('#previewZoomLevel').textContent(),'100%','new page fits');
   await page.locator('#prevPage').click();await page.waitForFunction(()=>document.querySelector('#pageInfo').textContent.includes('Sida 1'));
   await tools('Vy');
   await page.locator('#previewZoomIn').click();await page.locator('#previewZoomIn').click();
   await page.waitForTimeout(400);
   await tools('Dölj eller beskär');await page.locator('#cropMode').click();await wrap.scrollIntoViewIfNeeded();
   const view=await wrap.boundingBox(),drawing=await canvas.boundingBox();
   const start={x:Math.max(view.x+20,drawing.x+20),y:Math.max(view.y+20,drawing.y+20)};
   const selection={width:100,height:90};
   await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+selection.width,start.y+selection.height,{steps:8});await page.mouse.up();
   await page.waitForFunction(()=>document.querySelector('#pageState').textContent.includes('beskuren'));
   await page.locator('#undoDrawing').click();
   await page.waitForFunction(()=>!document.querySelector('#pageState').textContent.includes('beskuren'));
   assert(await page.locator('#redoDrawing').isEnabled());
   await page.locator('#redoDrawing').click();
   await page.waitForFunction(()=>document.querySelector('#pageState').textContent.includes('beskuren'));
   const download=page.waitForEvent('download');await page.locator('#savePdf').click();await page.locator('#pdfSaveConfirm').click();
   const doc=await PDFDocument.load(fs.readFileSync(await (await download).path()));
   assert.equal(doc.getPageCount(),2);
   const size=doc.getPage(0).getSize();
   assert(Math.abs(size.width-900*selection.width/drawing.width)<2,'crop maps to PDF coordinates after zoom');
   assert(Math.abs(size.height-600*selection.height/drawing.height)<2);
   assert.deepEqual(doc.getPage(1).getSize(),{width:900,height:600},'view zoom leaves other PDF pages unchanged');
   // History includes page removal, cleanup settings and manual masks, across pages.
   await tools('Sidor');await page.locator('#removePage').click();await page.locator('#closeTools').click();
   assert((await page.locator('#pageState').textContent()).includes('Tas bort'));
   await page.locator('#nextPage').click();await page.locator('#undoDrawing').click();
   assert((await page.locator('#pageInfo').textContent()).includes('Sida 1'));
   assert((await page.locator('#pageState').textContent()).includes('Tas med'));
   await page.locator('#redoDrawing').click();assert((await page.locator('#pageState').textContent()).includes('Tas bort'));
   await page.locator('#undoDrawing').click();
   await tools('Rensa ritningen');await page.locator('#removeText').check();await page.locator('#closeTools').click();
   assert(await page.locator('#redoDrawing').isDisabled(),'new edit clears redo');
   await page.locator('#undoDrawing').click();assert(!(await page.locator('#removeText').isChecked()));
   await page.locator('#redoDrawing').click();assert(await page.locator('#removeText').isChecked());
   await tools('Dölj eller beskär');await page.locator('#eraseMode').click();
   const bounds=await canvas.boundingBox(),area=await wrap.boundingBox();
   const mx=Math.max(bounds.x+10,area.x+10),my=Math.max(bounds.y+10,area.y+10);
   await page.mouse.move(mx,my);await page.mouse.down();await page.mouse.move(mx+40,my+40,{steps:5});await page.mouse.up();
   await page.waitForFunction(()=>document.querySelector('#pageState').textContent.includes('1 dolda områden'));
   await page.locator('#undoDrawing').click();await page.waitForFunction(()=>!document.querySelector('#pageState').textContent.includes('dolda områden'));
   await page.locator('#redoDrawing').click();await page.waitForFunction(()=>document.querySelector('#pageState').textContent.includes('1 dolda områden'));
   await page.locator('#toolFile').setInputFiles({name:'fresh.pdf',mimeType:'application/pdf',buffer:bytes});
   await page.waitForFunction(()=>document.querySelector('#toolMessage').textContent.includes('Ritningen är klar'));
   assert(await page.locator('#undoDrawing').isDisabled());assert(await page.locator('#redoDrawing').isDisabled());
   assert.deepEqual(errors,[]);
   await context.close();console.log('PASS '+(mobile?'mobile':'desktop')+': anchored wheel zoom, buttons, page fit, zoomed crop, PDF dimensions and undo/redo history');
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
