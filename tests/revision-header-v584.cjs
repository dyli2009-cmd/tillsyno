// v2.4.584: Kontrollflöde Dörrautomatik / Lås – header, tools menu and the question before leaving the drawing.
// Phone, iPad and desktop: no version line and no A− / A+, text always 100 %, Öppna and Stäng ritning next to Mall and PDF,
// a tool icon, no zoom buttons in the menu, stamp and overview actions as full rows. Hem and Stäng ritning go at once
// when nothing has changed since the PDF was saved, and otherwise ask first. Synthetic drawings only.
const {chromium}=require('playwright'),{PDFDocument,rgb}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/app.html'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Hem</title><h1 id="home">Hem</h1>');}if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});
const choose=async page=>{await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').first().click();await page.locator('input[value="automation"]').check();await page.locator('#allProtocolApply').click();};
async function drawing(){const doc=await PDFDocument.create(),p=doc.addPage([1190,842]);for(let i=0;i<12;i++)p.drawRectangle({x:60+i*85,y:200+(i%3)*150,width:40,height:60,borderColor:rgb(0,0,0),borderWidth:1});return Buffer.from(await doc.save());}
const open=(page,bytes,name)=>page.evaluate(async({b64,name})=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name,{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});await new Promise(r=>setTimeout(r,50));},{b64:Buffer.from(bytes).toString('base64'),name});
const addObject=page=>page.evaluate(()=>{items.push(normalize({uid:'test-'+items.length,type:'automation',page:1,x:.3,y:.3}));save();drawMarkers();});
const leaveQuestion=page=>page.locator('.revLeaveCard');

(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const bytes=await drawing(),base='http://127.0.0.1:'+server.address().port;
 for(const [label,options,theme] of [['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true},'night'],['ipad',{viewport:{width:820,height:1180},hasTouch:true},'mist'],['desktop',{viewport:{width:1440,height:900}},'mist']]){
  const context=await browser.newContext({...options,serviceWorkers:'block',acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
  // A larger text level chosen in Säkerhetsservice must not enlarge this page, and must stay stored for Säkerhetsservice.
  await page.addInitScript(t=>{try{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('tillsyno-ui-appearance-v1',JSON.stringify({theme:t,device:'auto'}));localStorage.setItem('tillsyno-controlflow-text-level-v1','3');}}catch(_){}},theme);
  await page.goto(base+'/controlflow-revision/all-in-one.html');await choose(page);
  assert.equal(await page.locator('.secAppHeader [data-tillsyno-version], .secAppHeader .headerModuleVersion').count(),0,label+': no version in the header');
  assert.ok(await page.locator('.allAreaVersion[data-tillsyno-version="dorrautomatik-las"]').count()>0,label+': the version stays in the folder chooser');
  await open(page,bytes,'Testritning 11.pdf');
  const layout=await page.evaluate(()=>{
   const header=document.querySelector('.secAppHeader'),primary=header.querySelector('.cfPrimaryActions'),order=[...primary.querySelectorAll('button')].filter(b=>!b.hidden).map(b=>b.id);
   const visible=n=>!!n&&n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden';
   const line=document.querySelector('.workspaceFileLine'),launcher=document.querySelector('.serviceToolLauncher');
   return {order,headerHeight:header.getBoundingClientRect().height,scale:getComputedStyle(document.documentElement).getPropertyValue('--cf-text-scale').trim(),
    large:document.documentElement.hasAttribute('data-cf-large-text'),textSize:document.body.dataset.appTextSize,stored:localStorage.getItem('tillsyno-controlflow-text-level-v1'),
    textButtons:[...document.querySelectorAll('[data-app-text-smaller],[data-app-text-larger],[data-app-text-reset]')].filter(visible).length,
    fileIn:line?.closest('.pagebar')?'pagebar':line?.closest('.objectBar')?'objectBar':line?.closest('.secAppHeader')?'header':'none',fileName:line?.textContent.trim(),
    toolIcon:!!launcher?.querySelector('svg[data-rev-icon="tools"]'),toolLabel:launcher?.getAttribute('aria-label'),
    overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.deepEqual(layout.order,['secChangeDrawing','revCloseDrawing','securityPreview','securityExport'],label+': Öppna and Stäng ritning next to Mall and PDF');
  assert.ok(layout.headerHeight<72,label+': one header row, '+layout.headerHeight);
  assert.equal(layout.scale,'1');assert.equal(layout.large,false);assert.equal(layout.textSize,'0');assert.equal(layout.stored,'3',label+': stored text level left for Säkerhetsservice');
  assert.equal(layout.textButtons,0,label+': no A− / A+');
  // Since v2.4.588 the file name and count are in the page row on every device.
  assert.equal(layout.fileIn,'pagebar');assert.equal(layout.fileName,'Testritning 11.pdf');
  assert.ok(layout.toolIcon,label+': tool icon');assert.equal(layout.toolLabel,'Verktyg');assert.equal(layout.overflow,false,label+': no horizontal scroll');

  await page.locator('.serviceToolLauncher').click();
  const menu=await page.evaluate(()=>{const actions=document.querySelector('.serviceToolsMenu .revToolActions'),rows=[...(actions?.children||[])].map(n=>({id:n.id,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}));
   const zoom=document.getElementById('controlflowPdfZoomControls');return {rows,zoomShown:!!zoom&&zoom.getClientRects().length>0,menuWidth:document.querySelector('.serviceToolsMenu').getBoundingClientRect().width};});
  assert.deepEqual(menu.rows.map(r=>r.id),['securitySelectStamps','revisionOverviewTool'],label+': stamp and overview rows');
  menu.rows.forEach(r=>{assert.ok(r.width>=Math.min(240,menu.menuWidth-40),label+': full-width row '+r.id+' '+r.width);assert.ok(r.height<=64,label+': text on one line '+r.id+' '+r.height);});
  assert.equal(menu.zoomShown,false,label+': no zoom buttons in the menu');
  await page.locator('.serviceToolLauncher').click();
  // Zoom still works on the engine, which the fingers and the mouse wheel use.
  assert.equal(await page.evaluate(()=>{setZoom(2);return zoom}),2);await page.evaluate(()=>{setZoom(1)});

  // Nothing changed since the drawing was opened: Stäng ritning closes at once.
  await page.locator('#revCloseDrawing').click();
  await page.waitForFunction(()=>!document.body.classList.contains('secHasPdf'));
  assert.equal(await leaveQuestion(page).count(),0,label+': no question without changes');
  assert.ok(await page.locator('#secEmpty').isVisible(),label+': back to Välj ritning');
  // The header follows the drawing state on the next frame.
  await page.waitForFunction(()=>document.getElementById('revCloseDrawing').hidden);
  assert.equal(await page.locator('#revCloseDrawing').isVisible(),false);

  // A change asks first. Avbryt stays, Stäng utan att spara PDF closes, and the work comes back with the same drawing.
  await open(page,bytes,'Testritning 11.pdf');await addObject(page);
  await page.locator('#revCloseDrawing').click();await leaveQuestion(page).waitFor();
  assert.equal(await page.locator('#revLeaveTitle').textContent(),'Stäng ritningen?');
  assert.deepEqual(await page.locator('.revLeaveActions button').allTextContents(),['Spara PDF','Stäng utan att spara PDF','Avbryt']);
  await page.locator('.revLeaveCancel').click();assert.equal(await leaveQuestion(page).count(),0);assert.ok(await page.evaluate(()=>!!pdf),label+': Avbryt keeps the drawing');
  await page.locator('#revCloseDrawing').click();await page.locator('.revLeaveDiscard').click();
  await page.waitForFunction(()=>!document.body.classList.contains('secHasPdf'));
  await open(page,bytes,'Testritning 11.pdf');
  assert.equal(await page.evaluate(()=>items.length),1,label+': work kept on the device after closing');

  // Hem with a change asks; Spara PDF saves the work PDF, then offers to leave.
  await addObject(page);
  await page.locator('.secAppHeader .homeIconLink').click();await leaveQuestion(page).waitFor();
  assert.equal(await page.locator('#revLeaveTitle').textContent(),'Lämna ritningen?');
  assert.ok(page.url().endsWith('/controlflow-revision/all-in-one.html'),label+': still on the drawing');
  await page.locator('.revLeaveSave').click();
  await page.locator('#secSaveWork').waitFor({state:'visible'});
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#secSaveWork').click()]);
  const saved=fs.readFileSync(await download.path());
  await leaveQuestion(page).waitFor();assert.equal(await page.locator('#revLeaveTitle').textContent(),'PDF:en är sparad');
  await page.locator('.revLeaveCancel').click();
  // Saved: Hem goes straight to the start page.
  await page.locator('.secAppHeader .homeIconLink').click();await page.waitForURL(/\/app\.html$/);
  assert.equal(await page.locator('#home').count(),1);

  // The saved work PDF opens again and continues; without changes Hem goes at once.
  await page.goto(base+'/controlflow-revision/all-in-one.html');await choose(page);
  await open(page,saved,'Testritning 11.pdf');
  if(await page.locator('#secOpenWorkDialog').isVisible())await page.locator('#secOpenContinue').click();
  assert.equal(await page.evaluate(()=>items.length),2,label+': work PDF round trip');
  await page.locator('.secAppHeader .homeIconLink').click();await page.waitForURL(/\/app\.html$/);

  // Without a drawing Hem is an ordinary link.
  await page.goto(base+'/controlflow-revision/all-in-one.html');await choose(page);
  await page.locator('.secAppHeader .homeIconLink').click();await page.waitForURL(/\/app\.html$/);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS revision header v584: one header row with Öppna/Stäng ritning, no version, no A− / A+, text 100 %, tool icon, no zoom buttons, full-width stamp and overview rows, leave question only after changes, save then leave, work kept and round trip.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
