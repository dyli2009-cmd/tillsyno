/* Real CE workflow, desktop dragging/docking, responsive restoration, and mobile layout regression. */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),baseline=process.env.CE_BASELINE_ROOT,qa=process.env.CE_DESKTOP_QA||'/tmp/ce-desktop-v357';
fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),parts=url.pathname.split('/'),before=parts[1]==='before',name='/'+parts.slice(2).join('/'),base=before?baseline:root;
 if(name==='/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({userId:'ce-desktop-test',role:'member',modules:['control']}),permitted:()=>true}");}
 const file=path.resolve(base||root,'.'+name);if(!file.startsWith((base||root)+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.pdf')?'application/pdf':'text/html');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}
});
let browser,origin;const errors=[];
async function pageFor(route='after',options={}){
 const {theme='mist',device='auto',...rest}=options;
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',...rest});
 await context.addInitScript(({theme,device})=>localStorage.setItem('tillsyno-ui-appearance-v1',JSON.stringify({theme,device})),{theme,device});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/'+route+'/ce-markning.html');
 await p.waitForFunction(()=>!document.documentElement.hasAttribute('data-ce-starting')&&!document.documentElement.hasAttribute('data-auth-pending'));
 await p.locator('#ceHomeNew').click();
 return {p,context};
}
async function door(p,location){
 await p.locator('#ceAddToggle').click();await p.locator('#ceDoorObject').fill('20-01-54-28');await p.locator('#ceDoorLocation').fill(location);await p.locator('#ceDoorSubmit').click();
 await p.waitForFunction(()=>document.getElementById('slrFlowTestDialog')?.open&&document.getElementById('slrStatusText')?.textContent.includes('CE-dokument för'));
}
async function viewAction(p,id){await p.locator('#ceDesktopView>summary').click();await p.locator('#'+id).click();}
async function desktop(){
 const {p,context}=await pageFor();
 assert(await p.evaluate(()=>document.documentElement.hasAttribute('data-ce-desktop')));
 assert.equal(await p.locator('#ceAddToggle svg').count(),1);assert.equal((await p.locator('#ceAddToggle').innerText()).trim(),'Ny dörr');
 for(const id of ['ceProjectActions','ceDocumentActions'])assert.equal(await p.locator('#'+id).evaluate(n=>n.parentElement.className),'ceDesktopTopActions');
 await door(p,'Entré');await p.locator('#slrTestExit').click();await door(p,'Korridor');
 assert.equal(await p.locator('dialog:modal').count(),0);assert.equal(await p.locator('.ceDoorOpen').count(),2);
 const doors=p.locator('.ceDoorOpen'),firstId=await doors.first().getAttribute('data-door');
 await doors.first().click();await p.waitForFunction(()=>document.getElementById('slrTestSource').textContent==='Entré');
 assert.equal(await doors.first().getAttribute('aria-current'),'true');
 assert.notEqual(await doors.first().evaluate(n=>getComputedStyle(n).backgroundColor),await doors.last().evaluate(n=>getComputedStyle(n).backgroundColor),'selected door is visibly highlighted');
 await p.locator('#ceNextDoor').click();await p.waitForFunction(()=>document.getElementById('slrTestSource').textContent==='Korridor');assert.equal(await doors.last().getAttribute('aria-current'),'true');
 await p.locator('#cePreviousDoor').click();await p.waitForFunction(()=>document.getElementById('slrTestSource').textContent==='Entré');
 // Existing independent document answers survive repeated direct door switches.
 await p.evaluate(first=>{const a=TillsynoCETest.payload();a.answers[first]=a.answers[first]||{};a.answers[first].Loggbok={fields:{Kommentar:'Dörrens egen text'}};},firstId);
 await doors.last().click();await doors.first().click();assert.equal(await p.evaluate(id=>TillsynoCETest.payload().answers[id].Loggbok.fields.Kommentar,firstId),'Dörrens egen text');
 const sep=p.locator('#ceDesktopDivider'),before=await p.locator('#ceDesktopDoors').boundingBox(),r=await sep.boundingBox();
 await p.mouse.move(r.x+r.width/2,r.y+90);await p.mouse.down();await p.mouse.move(r.x+105,r.y+90,{steps:8});await p.mouse.up();assert((await p.locator('#ceDesktopDoors').boundingBox()).width>before.width+80);
 await sep.focus();await p.keyboard.press('ArrowLeft');assert((await p.locator('#ceDesktopDoors').boundingBox()).width<before.width+100);
 await viewAction(p,'ceDesktopSwap');assert((await p.locator('#ceDesktopDoors').boundingBox()).x>(await p.locator('#ceDesktopDetail').boundingBox()).x);
 await viewAction(p,'ceDesktopTextMore');assert(Number(await p.locator('#ceWorkspace').evaluate(n=>getComputedStyle(n).getPropertyValue('--ce-text-scale')))>1);
 await viewAction(p,'ceDesktopFloat');assert(await p.locator('#ceDesktopDetail').evaluate(n=>n.classList.contains('is-floating')));
 const floating=await p.locator('#ceDesktopDetail').boundingBox(),header=await p.locator('#slrFlowTestDialog>header').boundingBox();
 await p.mouse.move(header.x+35,header.y+20);await p.mouse.down();await p.mouse.move(header.x-100,header.y+75,{steps:8});await p.mouse.up();assert.notEqual((await p.locator('#ceDesktopDetail').boundingBox()).x,floating.x);
 const handle=p.locator('.ceDesktopResize'),hr=await handle.boundingBox(),size=await p.locator('#ceDesktopDetail').boundingBox();
 await p.mouse.move(hr.x+12,hr.y+12);await p.mouse.down();await p.mouse.move(hr.x-65,hr.y-55,{steps:8});await p.mouse.up();assert((await p.locator('#ceDesktopDetail').boundingBox()).height<size.height-40);
 await viewAction(p,'ceDesktopFloat');assert(!await p.locator('#ceDesktopDetail').evaluate(n=>n.classList.contains('is-floating')));
 await viewAction(p,'ceDesktopReset');
 await p.screenshot({path:path.join(qa,'desktop-light.png')});
 // Crossing to tablet restores the original modal and original toolbar nodes.
 await p.setViewportSize({width:820,height:1000});await p.waitForFunction(()=>!document.documentElement.hasAttribute('data-ce-desktop'));assert.equal(await p.locator('dialog:modal').count(),1);assert.equal(await p.locator('#ceDesktopColumns').count(),0);assert.equal(await p.locator('#ceAddToggle svg').count(),1);
 await p.setViewportSize({width:1440,height:1000});await p.waitForFunction(()=>document.documentElement.hasAttribute('data-ce-desktop'));assert.equal(await p.locator('dialog:modal').count(),0);assert.equal(await p.locator('#ceDesktopColumns').count(),1);
 await p.locator('#slrTestExit').click();await p.locator('#ceCloseProject').click();await p.waitForFunction(()=>!document.getElementById('ceProjectHome').hidden);assert.equal(await p.locator('#slrFlowTestDialog[open]').count(),0);
 // Reopen from saved projects rather than reset/delete the account's work.
 await p.locator('#ceSavedProjects>summary').click();await p.locator('.ceHistoryRow button').first().click();await p.waitForFunction(()=>!document.getElementById('ceWorkspace').hidden);assert.equal(await p.locator('.ceDoorOpen').count(),2);
 await context.close();
 for(const theme of ['ice','coast','sand','night','graphite','pine']){
  const {p,context}=await pageFor('after',{theme,viewport:{width:1100,height:800}});await door(p,'Temakontroll');
  assert(await p.locator('#ceDesktopDetail').evaluate(n=>n.scrollWidth<=n.clientWidth+1));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.locator('#ceDocumentActions>summary').click();assert(await p.locator('#ceExportFiles').isVisible());await p.locator('#ceExportFiles').click();assert(await p.locator('#ceFileExport').isVisible());await p.locator('#ceFilesClose').click();
  if(theme==='night')await p.screenshot({path:path.join(qa,'desktop-dark-1100.png')});await context.close();
 }
 console.log('PASS desktop: real new doors, direct switching, previous/next, independent answers, drag/keyboard divider, swap sides, text size, float/drag/resize/dock, reset, resize-to-tablet modal restoration, project history, seven themes and export.');
}
async function mobileRegression(){
 const cases=[['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['ipad',{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}],['wide-touch',{viewport:{width:1366,height:1000},hasTouch:true,isMobile:true}],['manual-tablet',{device:'tablet'}],['manual-phone',{device:'phone'}],['small-desktop',{viewport:{width:1024,height:900}}]];
 for(const theme of ['mist','night'])for(const [name,opts]of cases){
  const shots=[];
  for(const route of baseline?['before','after']:['after']){
   const {p,context}=await pageFor(route,{...opts,theme});await door(p,'Entré');
   assert.equal(await p.locator('dialog:modal').count(),1,name+' remains modal');assert.equal(await p.locator('#ceDesktopColumns').count(),0);
   await p.locator('#slrTestExit').click();
   if(route==='after'){assert.equal(await p.locator('#ceAddToggle svg').count(),1);assert.equal((await p.locator('#ceAddToggle').innerText()).trim(),'Ny dörr');}
   const mask=p.locator('.ceToolsMenu,.ta-page-version,#ceStorageStatus,.ceTopIdentity small');
   shots.push(await p.screenshot({animations:'disabled',mask:[mask]}));
   if(route==='after'&&theme==='mist'&&['phone','ipad'].includes(name))await p.screenshot({path:path.join(qa,name+'.png')});
   await context.close();
  }
  if(shots.length===2){fs.writeFileSync(path.join(qa,name+'-'+theme+'-before.png'),shots[0]);fs.writeFileSync(path.join(qa,name+'-'+theme+'-after.png'),shots[1]);assert(shots[0].equals(shots[1]),name+' '+theme+': layout outside the requested icon change must be pixel-identical');}
 }
 console.log('PASS 12 non-desktop cases: iPhone, iPad, wide touch, manual phone/tablet and small desktop in light/dark; one plus and original modal behavior. Baseline comparison masks only the changed toolbar and volatile footer/status.');
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{await desktop();await mobileRegression();assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
