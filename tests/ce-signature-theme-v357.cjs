'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),qa=process.env.CE_DESKTOP_QA||'/tmp/ce-desktop-v357';fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname;
 if(name==='/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({userId:'signature-theme-test',role:'member',modules:['control']}),permitted:()=>true}");}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [device,viewport,touch]of [['desktop',{width:1440,height:1000},false],['tablet',{width:820,height:1180},true],['phone',{width:390,height:844},true]]){
   const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,serviceWorkers:'block'});await context.addInitScript(device=>localStorage.setItem('tillsyno-ui-appearance-v1',JSON.stringify({theme:'night',device})),device);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/ce-markning.html');
   await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-ce-starting'));await page.locator('#ceHomeNew').click();await page.locator('#ceProject').evaluate(n=>n.open=true);await page.locator('.ceSignatureGroup').evaluate(n=>n.open=true);
   await page.locator('#ceSignDate').fill('2026-10-15');await page.locator('#ceSignDateFormat').selectOption('month');await page.locator('#ceSignDateStyle').selectOption('regular');
   await page.locator('#ceProjectSign').click();assert(await page.locator('.ceProjectSignatureDialog').isVisible());
   assert(await page.locator('.ceProjectSignatureDialog').evaluate(n=>getComputedStyle(n).backgroundColor!=='rgb(255, 255, 255)'));
   const canvas=await page.locator('.ceProjectSignatureDialog canvas').boundingBox();await page.mouse.move(canvas.x+30,canvas.y+70);await page.mouse.down();await page.mouse.move(canvas.x+120,canvas.y+30,{steps:12});await page.mouse.move(canvas.x+220,canvas.y+90,{steps:12});await page.mouse.up();
   await page.getByRole('button',{name:'Spara underskrift',exact:true}).click();await page.waitForFunction(()=>document.getElementById('ceProjectSignStatus').classList.contains('is-saved'));
   const signature=await page.evaluate(()=>TillsynoCETest.getProjectSignature());assert(signature.startsWith('data:image/png'));
   for(const theme of ['ice','mist','coast','sand','night','graphite','pine']){
    const result=await page.evaluate(theme=>{
     document.documentElement.dataset.tillsynoTheme=theme;
     const vars=getComputedStyle(document.documentElement),probe=document.createElement('i');document.body.append(probe);
     const rgb=key=>{probe.style.color=vars.getPropertyValue(key);return getComputedStyle(probe).color;};
     const ink=rgb('--ta-ink'),soft=rgb('--ta-soft2'),muted=rgb('--ta-muted'),card=rgb('--ta-card');probe.remove();
     const ids=['ceSignDate','ceSignDateFormat','ceSignDateStyle'];const controls=ids.map(id=>{const s=getComputedStyle(document.getElementById(id));return {background:s.backgroundColor,ink:s.color};});
     const paper=getComputedStyle(document.getElementById('ceProjectSignPreview')),intro=getComputedStyle(document.querySelector('.ceSignIntro'));
     return {ink,soft,muted,card,labels:[...document.querySelectorAll('.ceSignOptions label span')].map(n=>getComputedStyle(n).color),options:getComputedStyle(document.querySelector('.ceSignOptions')).backgroundColor,controls,paper:paper.backgroundColor,intro:intro.color,signature:TillsynoCETest.getProjectSignature(),date:document.getElementById('ceSignDate').value,format:document.getElementById('ceSignDateFormat').value,style:document.getElementById('ceSignDateStyle').value};
    },theme);
    for(const control of result.controls){assert.equal(control.background,result.soft,device+' '+theme+' input background');assert.equal(control.ink,result.ink,device+' '+theme+' input text');}
    for(const color of result.labels)assert.equal(color,result.muted,device+' '+theme+' field label');
    assert.equal(result.paper,result.soft);assert.equal(result.options,result.card);assert.equal(result.intro,result.muted);assert.equal(result.signature,signature);assert.equal(result.date,'2026-10-15');assert.equal(result.format,'month');assert.equal(result.style,'regular');
    if(theme==='night')await page.locator('.ceSignatureGroup').screenshot({path:path.join(qa,'signature-'+device+'-dark.png')});
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS signature: 21 theme/device combinations, date/format/style and preview colors, themed signature dialog, real drawn/saved signature, unchanged PNG bytes and selected values through all themes.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
