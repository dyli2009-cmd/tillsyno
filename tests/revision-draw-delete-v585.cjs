// v2.4.585: Kontrollflöde Dörrautomatik / Lås. A selected drawing object (text, text with arrow, line, arrow,
// door symbols) shows a compact Ta bort button next to it on the drawing. Removal always asks first in the app's
// confirmation box; Avbryt keeps the object, Ta bort removes it, Ångra restores it. The menu's Ta bort asks too.
// Phone and desktop. Synthetic drawings only.
const {chromium}=require('playwright'),{PDFDocument,rgb}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});
const choose=async page=>{await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').first().click();await page.locator('input[value="automation"]').check();await page.locator('#allProtocolApply').click();};
const OBJECTS=[
 {uid:'t1',type:'text',page:1,x:.35,y:.35,text:'Testtext',hit:'.drawTextHit',name:'texten'},
 {uid:'t2',type:'text-arrow',page:1,x:.55,y:.6,targetX:.7,targetY:.8,text:'Pilen',hit:'.drawTextHit',name:'texten med pil'},
 {uid:'l1',type:'line',page:1,x1:.15,y1:.8,x2:.4,y2:.85,hit:'.drawHit',name:'linjen'},
 {uid:'a1',type:'arrow',page:1,x1:.15,y1:.15,x2:.3,y2:.2,hit:'.drawHit',name:'pilen'},
 {uid:'d1',type:'door-single',page:1,x:.8,y:.3,size:.075,angle:0,flip:false,hit:'.drawDoorHit',name:'dörrsymbolen'},
 {uid:'d2',type:'door-double',page:1,x:.85,y:.7,size:.075,angle:0,flip:false,hit:'.drawDoorHit',name:'dörrsymbolen'}];

(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const doc=await PDFDocument.create(),pg=doc.addPage([1190,842]);pg.drawRectangle({x:60,y:60,width:1070,height:720,borderColor:rgb(0,0,0),borderWidth:1});
 const b64=Buffer.from(await doc.save()).toString('base64');
 for(const [label,options] of [['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['desktop',{viewport:{width:1440,height:900}}]]){
  const context=await browser.newContext({...options,serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
  await page.goto('http://127.0.0.1:'+server.address().port+'/controlflow-revision/all-in-one.html');await choose(page);
  await page.evaluate(async b64=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'Test.pdf',{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});},b64);
  await page.evaluate(objects=>{for(const o of objects){const {hit,name,...item}=o;drawingExtras.push(item)}save();drawMarkers();},OBJECTS);
  const button=page.locator('.drawQuickDelete');
  assert.equal(await button.isVisible(),false,label+': hidden while nothing is selected');
  const tap=async(x,y)=>{if(options.hasTouch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);};
  const select=async object=>{
   // Hit targets are rendered per object; pick the one for this uid.
   const box=await page.locator(object.hit+'[data-draw-uid="'+object.uid+'"]').boundingBox();
   await tap(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(120);
   // A tap on a text opens the inline editor (existing behaviour); close it so the drawing is in view again.
   await page.evaluate(()=>document.querySelector('.serviceInlineTextEditor input,.serviceInlineTextEditor textarea')?.blur());await page.waitForTimeout(60);
   return box;
  };
  for(const object of OBJECTS){
   const box=await select(object);
   assert.ok(await button.isVisible(),label+': button shown for '+object.type);
   const b=await button.boundingBox();
   const distance=Math.max(0,box.x-(b.x+b.width),b.x-(box.x+box.width))+Math.max(0,box.y-(b.y+b.height),b.y-(box.y+box.height));
   assert.ok(distance<80,label+': button next to '+object.type+' ('+Math.round(distance)+' px)');
   assert.ok(b.width<=(label==='phone'?40:120)&&b.height<=40,label+': compact button '+b.width+'×'+b.height);
   assert.equal(await button.getAttribute('aria-label'),'Ta bort '+object.name);
   // Ask first: Avbryt keeps the object.
   await button.click();await page.locator('#controlflowAppDialog[open]').waitFor();
   assert.equal(await page.locator('#controlflowAppDialogTitle').textContent(),'Ta bort '+object.name+'?');
   assert.match(await page.locator('#controlflowAppDialogDescription').textContent(),/Är du säker\?.*Ångra/);
   await page.locator('#controlflowAppDialog .cfAppDialogCancel').click();await page.locator('#controlflowAppDialog').waitFor({state:'detached'});
   assert.ok(await page.evaluate(uid=>drawingExtras.some(x=>x.uid===uid),object.uid),label+': Avbryt keeps '+object.type);
   assert.ok(await page.evaluate(uid=>localStorage.getItem('doorservice-all-in-one:'+activeKey).includes('"'+uid+'"'),object.uid));
   // Ta bort removes it and saves; Ångra restores it.
   await select(object);await button.click();await page.locator('#controlflowAppDialog .cfAppDialogSubmit').click();
   await page.waitForFunction(uid=>!drawingExtras.some(x=>x.uid===uid),object.uid);
   assert.equal(await button.isVisible(),false,label+': hidden after removal');
   assert.ok(!(await page.evaluate(uid=>localStorage.getItem('doorservice-all-in-one:'+activeKey).includes('"'+uid+'"'),object.uid)),label+': removal saved');
   await page.locator('.sessionHistoryBar .historyIconButton').first().click();
   await page.waitForFunction(uid=>drawingExtras.some(x=>x.uid===uid),object.uid);
  }
  // The delete action in the tools menu asks too.
  await select(OBJECTS[0]);
  await page.locator('.serviceToolLauncher').click();
  await page.locator('.toolSelected .dangerTool').click();await page.locator('#controlflowAppDialog[open]').waitFor();
  await page.locator('#controlflowAppDialog .cfAppDialogCancel').click();
  assert.equal(await page.evaluate(()=>drawingExtras.length),OBJECTS.length,label+': menu Ta bort asks first');
  // Drawing mode hides the button.
  await page.evaluate(()=>{document.querySelector('.serviceToolChoices button[aria-label="Linje / vägg"]').click()});
  assert.equal(await button.isVisible(),false,label+': hidden while drawing');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS revision draw delete v585: compact Ta bort next to every drawing object type, confirmation with Avbryt and Ta bort, saved, Ångra restores, menu Ta bort asks, hidden while drawing.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
