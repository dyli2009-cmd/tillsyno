/* Avläsning TEST 9.28: editable material columns stay readable and usable in
 * portrait and landscape iPad-sized Safari-like viewports. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');

const root=path.resolve(__dirname,'..');
const server=http.createServer((request,response)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{
  response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip'})[path.extname(file)]||'application/octet-stream');
  response.end(fs.readFileSync(file));
 }catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-28.html`;
const safariIpadUA='Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const codeRect={x:.08,y:.08,w:.80,h:.06},tableRect={x:.04,y:.16,w:.93,h:.64},bounds={x:.035,y:.075,w:.94,h:.73};

function workItem(key,label,value,quantity,row){
 return {key,text:label+' · '+value,legacyText:label+' · '+value,label,value,quantity,section:'Övrig utrustning',sectionKey:'ovrig-utrustning',tableIndex:0,sourceRow:row,sourceIdentity:`gs:0:${row}:ovrig-utrustning:${label}:${value}`.toLocaleLowerCase('sv-SE'),responsibility:'GS'};
}
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
 const plan=document.addPage([595,842]);plan.drawText('GS25',{x:80,y:680,size:18,font:bold});
 const card=document.addPage([595,842]);card.drawText('Beslagskod: GS25',{x:60,y:750,size:20,font:bold});
 card.drawText('Dorrstangare DC700 GS',{x:55,y:665,size:12,font});card.drawText('Dorrmagnet MK240 GS',{x:55,y:630,size:12,font});
 const closer=workItem('closer-dc700','Dörrstängare','DC700',2,2),magnet=workItem('magnet-mk240','Dörrmagnet','MK240',1,3),workItems=[closer,magnet];
 const cards={'card-gs25':{id:'card-gs25',page:2,code:'GS25',originalCardCode:'GS25',header:'Beslagskod: GS25',codeRect,tableRect,bounds,rawTable:'Dörrstängare DC700 GS\nDörrmagnet MK240 GS',work:workItems.map(item=>item.text),workItems,workState:'ready',workPolicy:'gs-install-v3',choices:['GS25'],method:'PDF-text',confidence:100}};
 const rect=[75,675,130,700],hits=[{page:1,code:'GS25',rect,box:{x:rect[0]/595,y:(842-rect[3])/842,w:(rect[2]-rect[0])/595,h:(rect[3]-rect[1])/842},positionId:'door-gs25',selected:true,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'gs',order:870000}];
 const checks={'door-gs25':{'closer-dc700':false,'magnet-mk240':false}};
 const readTestData={schema:1,phase:'full',sourceId:'generated:time-material-ipad-v925',rects:{code:codeRect,table:tableRect},pages:[2],cards,checks,matching:{version:2,hits,pages:[{page:1,count:1,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},drawingSample:null,name:'Redigerbara material på iPad TEST 9.28'};
 const payload={schema:6,projectId:'project:time-material-ipad-v925',projectRevision:1,timeConfig:{minutes:{closer:30,magnet:30},custom:[],disabled:[],materials:{}},instances:{'door-gs25':{checks:checks['door-gs25'],rowStages:{},progress:0,overrides:{},customItems:[]}},automationItems:[],readTestData};
 for(const key of ['TillsynoSmartMatchV36Data','TillsynoSmartMatchV30Data'])document.catalog.set(PDFName.of(key),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}

async function contextFor(browser,viewport){
 const context=await browser.newContext({viewport,userAgent:safariIpadUA,hasTouch:true,deviceScaleFactor:1,isMobile:false,locale:'sv-SE'});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 return context;
}
async function openPrepared(page,bytes){
 await page.goto(url());
 await page.locator('#pwFile').setInputFiles({name:'time-material-ipad-v925.pdf',mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===1&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
 await page.locator('#pwTimeReport').click();await page.waitForSelector('#pwTimeDialog[open]');
 await page.waitForFunction(()=>document.querySelectorAll('#pwTimeRows .pwMaterialTableRow').length===2,null,{timeout:30000});
}
async function geometries(page,selector){
 return page.locator(selector).evaluateAll(nodes=>nodes.map(node=>({clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,display:getComputedStyle(node).display,columns:getComputedStyle(node).gridTemplateColumns})));
}
function assertContained(box,viewport,label){
 assert(box.clientWidth>0,label+' has visible width');
 assert(box.scrollWidth<=box.clientWidth+1,label+` has no horizontal overflow (${box.scrollWidth} > ${box.clientWidth})`);
 assert(box.left>=-1&&box.right<=viewport+1,label+' remains inside the viewport');
}
async function verifyViewport(browser,bytes,viewport,layout){
 const tag=`${viewport.width}x${viewport.height}`,context=await contextFor(browser,viewport),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await openPrepared(page,bytes);
  assert.equal(await page.evaluate(()=>navigator.userAgent.includes('iPad')&&navigator.maxTouchPoints>0),true,tag+': runs in an iPad-like touch context');
  assert.equal((await page.locator('#pwTimeProductsTab').innerText()).trim(),'Per produkt');
  assert.equal(await page.locator('.pwMaterialTableRow').count(),2,tag+': both project materials are visible');
  const headers=await page.locator('.pwMaterialTableHeader').evaluateAll(nodes=>nodes.map(node=>[...node.children].map(child=>child.textContent)));
  assert(headers.length>=1&&headers.every(header=>JSON.stringify(header)===JSON.stringify(['Material','Antal','Tid/st','Total',''])),tag+': every material group defines all editable columns');

  const headerDisplay=await page.locator('.pwMaterialTableHeader').first().evaluate(node=>getComputedStyle(node).display);
  assert.equal(headerDisplay,layout==='wide'?'grid':'none',tag+': the column header follows the responsive layout');
  const first=page.locator('#pwTimeRows [data-time-key="closer"] .pwMaterialTableRow');
  assert.equal(await first.count(),1,tag+': DC700 has one reusable material row');
  const labelInput=first.locator('.pwMaterialCellName input'),timeInput=first.locator('.pwMaterialCellUnitTime input');
  assert.equal(await labelInput.isEditable(),true,tag+': material name is editable');
  assert.equal(await timeInput.isEditable(),true,tag+': time per unit is editable');
  assert.equal(await timeInput.inputValue(),'0,30',tag+': category time is shown per unit');
  assert.match((await first.innerText()).replace(/\s+/g,' '),/Antal 2 st.*Tid\/st.*Total 1 h/,tag+': quantity and calculated total stay in the same row');

  for(const selector of ['html','#pwTimeDialog','.pwTimeBody','#pwTimeProductsPanel','#pwTimeRows','.pwMaterialTable','.pwMaterialTableRow']){
   const boxes=await geometries(page,selector);assert(boxes.length>0,tag+' '+selector+' exists');
   boxes.forEach((box,index)=>assertContained(box,viewport.width,tag+' '+selector+' '+(index+1)));
  }
  const rowGrids=(await geometries(page,'.pwMaterialTableRow')).map(box=>box.columns.trim().split(/\s+/).length);
  assert(rowGrids.every(count=>count===(layout==='wide'?5:2)),tag+': every material row uses the intended responsive column count');
  const controls=await page.locator('.pwMaterialTableRow input,.pwMaterialTableRow button').evaluateAll(nodes=>nodes.map(node=>({visible:!!(node.offsetWidth||node.offsetHeight),height:node.getBoundingClientRect().height,right:node.getBoundingClientRect().right})));
  assert(controls.every(control=>control.visible&&control.height>=30&&control.right<=viewport.width+1),tag+': every editable control remains visible and tappable');

  await labelInput.fill('Dörrstängare DC700 – korrigerad');await labelInput.dispatchEvent('change');
  await page.waitForFunction(()=>document.querySelector('.pwMaterialCellName input')?.value.includes('korrigerad'));
  const edited=page.locator('#pwTimeRows [data-time-key="closer"] .pwMaterialTableRow');
  const editedTime=edited.locator('.pwMaterialCellUnitTime input');await editedTime.fill('0,45');await editedTime.dispatchEvent('change');
  await page.waitForFunction(()=>document.getElementById('pwTimeTotal').textContent==='2 h');
  assert.equal(await edited.locator('.pwMaterialCellName input').inputValue(),'Dörrstängare DC700 – korrigerad',tag+': edited material name survives rerender');
  assert.equal(await edited.locator('.pwMaterialCellUnitTime input').inputValue(),'0,45',tag+': edited unit time survives rerender');
  assert.match((await edited.locator('.pwMaterialCellTotal').innerText()).replace(/\s+/g,' '),/1 h 30 min/,tag+': two units use the edited per-unit time');
  assert.equal((await page.locator('#pwTimeTotal').innerText()).trim(),'2 h',tag+': project total is recalculated');
  (await geometries(page,'.pwMaterialTableRow')).forEach((box,index)=>assertContained(box,viewport.width,tag+' edited row '+(index+1)));

  await edited.getByRole('button',{name:'Återställ'}).click();
  await page.waitForFunction(()=>document.getElementById('pwTimeTotal').textContent==='1 h 30 min');
  const restored=page.locator('#pwTimeRows [data-time-key="closer"] .pwMaterialTableRow');
  assert.equal(await restored.locator('.pwMaterialCellUnitTime input').inputValue(),'0,30',tag+': reset restores project material name and category time');
  assert.deepEqual(errors,[],tag+': no page errors');
 }finally{await context.close();}
}

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const bytes=await fixture();
  await verifyViewport(browser,bytes,{width:820,height:1180},'compact');
  await verifyViewport(browser,bytes,{width:1180,height:820},'wide');
  console.log('PASS TEST 9.28: editable material name, quantity, per-unit time, total and reset stay responsive in portrait and landscape iPad layouts');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
