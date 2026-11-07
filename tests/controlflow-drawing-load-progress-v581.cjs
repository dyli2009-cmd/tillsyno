// v2.4.581: Kontrollflöde Dörrautomatik shows a progress card while a drawing opens.
// The bar only moves forward, reaches 100 % when the page is shown, follows the theme, fits a phone,
// blocks the drawing while it loads, and closes at once when the file cannot be opened. Synthetic drawings only.
const {chromium}=require('playwright'),{PDFDocument,PDFName}=require('../vendor/pdf-lib.min.js');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+'/'))return res.end();if(f===root+'/auth/client.js'){res.setHeader('Content-Type','application/javascript');return res.end("window.TillsynoAuth={root:new URL('../',document.currentScript.src),verify:async()=>({role:'member',modules:['control']}),permitted:()=>true}");}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch(e){res.writeHead(404);res.end();}});
const choose=async page=>{await page.locator('#allProtocolDialog[open]').waitFor();await page.locator('.allProtocolGroup summary').first().click();await page.locator('input[value="automation"]').check();await page.locator('#allProtocolApply').click();};
function rng(seed){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
async function heavyDrawing(){const doc=await PDFDocument.create(),page=doc.addPage([2384,3370]),r=rng(5),parts=['0.25 w 0 0 0 RG'];
 for(let i=0;i<90000;i++){const x=r()*2384,y=r()*3370,a=r()*Math.PI*2,l=5+r()*120;parts.push(`${x.toFixed(2)} ${y.toFixed(2)} m ${(x+Math.cos(a)*l).toFixed(2)} ${(y+Math.sin(a)*l).toFixed(2)} l S`);}
 page.node.set(PDFName.of('Contents'),doc.context.register(doc.context.stream(parts.join('\n'))));return doc.save();}
// Opens a file and samples the card every 50 ms until the open handler has finished.
const openTraced=(page,bytes,name)=>page.evaluate(async({b64,name})=>{const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name,{type:'application/pdf'}),trace=[];
 const sample=()=>{const box=document.querySelector('.cfLoad'),card=document.querySelector('.cfLoadCard');trace.push({value:window.DrawingLoadProgress.value,shown:!!box&&!box.hidden,state:box?.dataset.state,step:document.querySelector('.cfLoadStep')?.textContent||'',name:document.querySelector('.cfLoadName')?.textContent||'',now:document.querySelector('.cfLoadTrack')?.getAttribute('aria-valuenow'),blocks:box&&!box.hidden?document.elementFromPoint(innerWidth/2,innerHeight-120)?.closest('.cfLoad')===box:null,width:card?Math.round(card.getBoundingClientRect().width):0,background:card?getComputedStyle(card).backgroundColor:''});};
 const timer=setInterval(sample,50);sample();await $('securityFile').onchange({target:{files:[f],value:''}});sample();clearInterval(timer);
 await new Promise(r=>setTimeout(r,700));const box=document.querySelector('.cfLoad');
 return {trace,hiddenAfter:!box||box.hidden,message:$('securityMessage').textContent,error:$('securityMessage').classList.contains('error'),overflow:document.documentElement.scrollWidth>innerWidth};},{b64:Buffer.from(bytes).toString('base64'),name});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const heavy=await heavyDrawing();
 for(const [label,options,theme] of [['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},'night'],['ipad',{viewport:{width:820,height:1180},hasTouch:true},'mist']]){
  const context=await browser.newContext({...options,serviceWorkers:'allow'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
  await page.addInitScript(t=>{try{localStorage.setItem('tillsyno-ui-appearance-v1',JSON.stringify({theme:t,device:'auto'}))}catch(_){}},theme);
  await page.goto('http://127.0.0.1:'+server.address().port+'/controlflow-revision/all-in-one.html');await choose(page);
  const run=await openTraced(page,heavy,'Plan 3 A0.pdf'),shown=run.trace.filter(t=>t.shown&&t.value!==null),values=shown.map(t=>t.value);
  assert(shown.length>=3,label+': the card was visible while loading');
  values.forEach((v,i)=>assert(i===0||v>=values[i-1],label+': the bar only moves forward '+values.join(',')));
  assert.equal(Math.max(...values),100,label+': reaches 100 %');
  assert(shown.filter(t=>t.state==='loading').every(t=>t.value<100),label+': 100 % only when the drawing is shown');
  assert(shown.every(t=>t.now===String(t.value)),label+': progressbar value for screen readers');
  assert.equal(shown[0].name,'Plan 3 A0.pdf');
  const steps=[...new Set(shown.map(t=>t.step))];
  assert(steps.includes('Öppnar ritningen')&&steps.some(t=>/^Ritar sidan i sparläge/.test(t))&&steps.at(-1)==='Klart',label+': steps '+steps.join(' | '));
  assert(shown.filter(t=>t.state==='loading').every(t=>t.blocks),label+': the drawing cannot be zoomed while it loads');
  assert(shown[0].width<=380&&shown[0].width>=300,label+': card width '+shown[0].width);
  if(theme==='night')assert.notEqual(shown[0].background,'rgb(255, 255, 255)','dark theme card');
  assert.equal(run.hiddenAfter,true);assert.equal(run.overflow,false);assert.match(run.message,/^Stor ritning – visas i sparläge\./);
  // A file that cannot be opened closes the card at once and shows the error.
  const broken=await openTraced(page,Buffer.from('not a pdf'),'Trasig.pdf');
  assert.equal(broken.hiddenAfter,true);assert.equal(broken.error,true);assert.equal(broken.trace.at(-1).shown,false,label+': card closed with the error');
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS loading card: forward-only bar to 100 % when shown, real steps, theme, phone and iPad width, blocks zoom while loading, closes on error.');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
