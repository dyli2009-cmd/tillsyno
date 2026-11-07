// v2.4.588: Kontrollflöde Dörrautomatik / Lås – Ritning, Översikt and Projekt on phone, iPad and desktop, light and dark.
// Ritning: no explanations in the message row (errors still shown), file name and count in the page row, no "Svep",
// the eye in the tool row, page buttons and eye follow the theme. Översikt: no file row, no Tillbaka, no Kundmall,
// small title, compact numbers on a phone, starts on Objekt med anmärkning. Projekt: no title, no file row, no ×,
// no Service heading, the Projekt heading and forms kept, Starta ny service last. Synthetic drawings only.
const {chromium}=require('playwright'),{PDFDocument,rgb}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});
const choose=async page=>{await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').first().click();await page.locator('input[value="automation"]').check();await page.locator('#allProtocolApply').click();};
const shown=(page,selector)=>page.evaluate(s=>[...document.querySelectorAll(s)].some(n=>n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden'),selector);
const rgbOf=value=>(value.match(/\d+(\.\d+)?/g)||[]).slice(0,3).map(Number);
const light=value=>{const [r,g,b]=rgbOf(value);return (r*299+g*587+b*114)/1000;};

(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const doc=await PDFDocument.create(),pg=doc.addPage([1190,842]);pg.drawRectangle({x:60,y:60,width:1070,height:720,borderColor:rgb(0,0,0),borderWidth:1});
 const b64=Buffer.from(await doc.save()).toString('base64');
 for(const [label,options,theme] of [['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true},'mist'],['phone-night',{viewport:{width:390,height:844},isMobile:true,hasTouch:true},'night'],['ipad',{viewport:{width:820,height:1180},hasTouch:true},'mist'],['desktop-night',{viewport:{width:1440,height:900}},'night']]){
  const context=await browser.newContext({...options,serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
  await page.addInitScript(t=>{try{localStorage.setItem('tillsyno-ui-appearance-v1',JSON.stringify({theme:t,device:'auto'}))}catch(_){}},theme);
  await page.goto('http://127.0.0.1:'+server.address().port+'/controlflow-revision/all-in-one.html');await choose(page);
  await page.evaluate(async b64=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'Testritning.pdf',{type:'application/pdf'});await $('securityFile').onchange({target:{files:[f],value:''}});},b64);
  await page.evaluate(()=>{project.projectName='Testprojekt';const statuses=['ok','action','fail','untested'];for(let i=0;i<8;i++){const o=normalize({uid:'s'+i,type:'automation',page:1,x:.15+i*.09,y:.4});o.status=statuses[i%4];items.push(o)}save();drawMarkers();});
  await page.waitForTimeout(200);

  // Ritning
  await page.evaluate(()=>msg('Tryck där pilen ska peka; texten placeras bredvid.'));await page.waitForTimeout(50);
  assert.equal(await shown(page,'#securityMessage'),false,label+': no explanation in the message row');
  await page.evaluate(()=>msg('Kunde inte öppna PDF-filen.',true));await page.waitForTimeout(50);
  assert.ok(await shown(page,'#securityMessage'),label+': errors are still shown');
  await page.evaluate(()=>msg('Skapar arbets-PDF…'));await page.waitForTimeout(50);
  assert.ok(await shown(page,'#securityMessage'),label+': ongoing work is still shown');
  await page.evaluate(()=>msg(''));
  assert.equal(await shown(page,'.objectBar'),false,label+': no object row');
  assert.equal(await shown(page,'.mobileSwipeHint'),false,label+': no Svep');
  const bar=await page.evaluate(()=>{const info=document.querySelector('.pagebar .revPageInfo'),name=info?.querySelector('.workspaceFileName');
   return {text:[name?.textContent.trim(),info?.querySelector('#securityCount')?.textContent.trim()].join(' '),full:!!name&&name.scrollWidth<=name.clientWidth+1,eyeInTools:!!document.querySelector('.sessionHistoryCenter > #secToggleOverlays + .serviceToolsWrap'),
    prevBg:getComputedStyle(document.getElementById('secPrev')).backgroundColor,eyeBg:getComputedStyle(document.getElementById('secToggleOverlays')).backgroundColor,toolBg:getComputedStyle(document.querySelector('.serviceToolLauncher')).backgroundColor,
    overflow:document.documentElement.scrollWidth>innerWidth}});
  assert.equal(bar.text,'Testritning.pdf 8 objekt',label+': file name and count in the page row');
  assert.ok(bar.full,label+': the file name is not cut');
  assert.ok(bar.eyeInTools,label+': the eye sits before Verktyg in the tool row');
  if(theme==='night'){assert.ok(light(bar.prevBg)<120&&light(bar.eyeBg)<120,label+': page buttons and eye follow the dark theme '+bar.prevBg+' '+bar.eyeBg);}
  assert.deepEqual(rgbOf(bar.prevBg),rgbOf(bar.toolBg),label+': same colour as the tool buttons');
  assert.equal(bar.overflow,false,label+': no sideways scroll');

  // Översikt
  await page.locator('#secNavOverview').click();await page.locator('#securityOverview').waitFor({state:'visible'});await page.waitForTimeout(150);
  assert.equal(await shown(page,'.objectBar'),false);
  assert.equal(await shown(page,'#revisionInlineWorkspace .revisionInlineNavigation'),false,label+': no Tillbaka');
  assert.equal(await shown(page,'#secOverviewCustomerPreview'),false,label+': no Kundmall next to the title');
  assert.equal(await shown(page,'.secAppHeader .brand'),false);
  const ov=await page.evaluate(()=>{const h=document.querySelector('#securityOverview .overviewHead h2'),f=document.getElementById('secOverviewFilter'),sum=document.getElementById('secOverviewSummary');
   return {title:parseFloat(getComputedStyle(h).fontSize),filter:f.value,label:f.selectedOptions[0].textContent,cards:[...document.querySelectorAll('#secOverviewList [data-uid]')].map(n=>n.dataset.uid),sumHeight:sum.getBoundingClientRect().height}});
  assert.ok(ov.title<=16,label+': small Översikt title '+ov.title);
  assert.equal(ov.filter,'problems');assert.equal(ov.label,'Objekt med anmärkning');
  const problems=await page.evaluate(()=>items.filter(o=>hasSecurityProblem(o)).map(o=>o.uid));
  assert.deepEqual(ov.cards.sort(),problems.sort(),label+': only objects with a remark first');
  if(label.startsWith('phone'))assert.ok(ov.sumHeight<=110,label+': compact numbers on a phone '+ov.sumHeight);
  await page.selectOption('#secOverviewFilter','all');
  assert.equal(await page.evaluate(()=>document.querySelectorAll('#secOverviewList [data-uid]').length),8,label+': Alla objekt shows all');
  if(theme==='night'){const block=await page.evaluate(()=>{const n=document.querySelector('#securityOverview .secRemediationDescriptionBlock');return n?getComputedStyle(n).backgroundColor:null});if(block)assert.ok(light(block)<120,label+': remediation field follows the dark theme '+block);}
  // Opening Översikt again starts on Objekt med anmärkning.
  await page.locator('#secNavDrawing').click();await page.locator('#secNavOverview').click();await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>document.getElementById('secOverviewFilter').value),'problems');

  // Projekt
  await page.locator('#secNavProject').click();await page.locator('#securityProject').waitFor({state:'visible'});await page.waitForTimeout(150);
  assert.equal(await shown(page,'.secAppHeader .brand'),false,label+': no Dörrautomatik / Lås title');
  assert.equal(await shown(page,'.secAppHeader .headerSubtitle'),false);
  assert.equal(await shown(page,'.objectBar'),false);
  assert.equal(await shown(page,'#secCloseProject'),false,label+': no ×');
  assert.equal(await shown(page,'#revisionServiceTitle'),false,label+': no Service heading');
  assert.ok(await shown(page,'#revisionProjectTitle'),label+': Projekt heading kept');
  for(const id of ['secCompany','secTechnician','secProjectName','secCustomer'])assert.equal(await page.locator('#'+id).count(),1,label+': form field '+id+' kept');
  const proj=await page.evaluate(()=>{const h=document.querySelector('#securityProject > .sheetHead h2'),cards=[...document.querySelectorAll('#securityProject .projectCard')],last=cards.at(-1);
   return {title:parseFloat(getComputedStyle(h).fontSize),last:last?.classList.contains('secNewServiceCard'),below:last.getBoundingClientRect().top>=document.getElementById('secCustomer').getBoundingClientRect().bottom}});
  assert.ok(proj.title<=16,label+': small project title');
  assert.ok(proj.last&&proj.below,label+': Starta ny service last, after Beställare');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS revision views v588: no explanations (errors kept), file and count in the page row, eye in the tool row, themed page buttons, compact Översikt on Objekt med anmärkning, Projekt without title, × and Service heading, Starta ny service last.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
