/* Valid embedded projects must survive failure of the optional stamp index.
 * Uses a generated PDF only; no customer documents or external services.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
 catch(_){res.writeHead(404);res.end();}
});
function rowKey(text,index){let h=2166136261;for(const character of text)h=Math.imul(h^character.charCodeAt(0),16777619);return 'read:'+index+':'+(h>>>0).toString(36);}
async function fixture(){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),plan=doc.addPage([595,842]),card=doc.addPage([595,842]);
 const work=['Las ASSA EL580','Dorrautomatik ED100','Handtag HOPPE'];
 for(const [index,y]of [640,500].entries())plan.drawText('GS88',{x:60+index*240,y,size:20,font});
 card.drawText('Beslagskod GS88',{x:60,y:730,size:20,font});
 for(const [index,text]of work.entries())card.drawText(text,{x:60,y:650-index*30,size:17,font});
 const codeRect={x:.09,y:.10,w:.62,h:.06},tableRect={x:.09,y:.20,w:.70,h:.15},bounds={x:.08,y:.09,w:.72,h:.27};
 const rects=[[60,640,120,665],[300,500,360,525]];
 const matching={version:2,hits:rects.map((rect,index)=>({page:1,code:'GS88',rect,box:{x:rect[0]/595,y:(842-rect[3])/842,w:(rect[2]-rect[0])/595,h:(rect[3]-rect[1])/842},source:'PDF-stämpel',scanSource:'read-tool-v5',sourceKind:'gs',order:870000+index,selected:index===0,label:'GS88'})),pages:[{page:1,count:2,scanMode:'stamp-index',imageSkipped:true,indexedHits:2}],warnings:[]};
 const readTestData={schema:1,sourceId:'embedded-project-fixture',rects:{code:codeRect,table:tableRect},pages:[2],cards:{'saved-card':{id:'saved-card',page:2,code:'GS88',header:'Beslagskod GS88',rawTable:work.join('\n'),work,codeRect,tableRect,bounds,choices:['GS88'],method:'PDF-text',confidence:100}},checks:{'scan:GS88@1:60,640,120,665':{[rowKey(work[0],0)]:true}},matching,drawingSample:null,name:'Saved source data',imageMode:'auto'};
 const project={schema:6,projectRevision:1,projectId:'stamp-index-fallback-regression',instances:{},automationItems:[],readTestData};
 doc.catalog.set(PDFName.of('TillsynoSmartMatchV30Data'),PDFHexString.fromText(JSON.stringify(project)));
 return {bytes:Buffer.from(await doc.save()),readTestData};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  const input=await fixture();browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:JSON.parse(process.env.SMARTMATCH_BROWSER_ARGS||'["--no-sandbox"]')});
  const context=await browser.newContext(),page=await context.newPage(),errors=[],remote=[];
  await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!/^(http:\/\/127\.0\.0\.1:|blob:|data:)/.test(request.url()))remote.push(request.url());});
  await page.goto(`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v5.html`);
  await page.evaluate(()=>{
   window.__forcedStampIndexFailures=0;
   window.SmartMatchReadStamps={readDocument:()=>{window.__forcedStampIndexFailures++;throw Error('Synthetic optional stamp-index failure');}};
   const original=SmartMatchReadMatcher;
   window.SmartMatchReadMatcher={...original,scan:()=>{throw Error('A restored reviewed project must not run a new search');}};
  });
  await page.locator('#pwFile').setInputFiles({name:'saved-project.pdf',mimeType:'application/pdf',buffer:input.bytes});
  await page.waitForSelector('#rtDialog[open]');
  assert.equal(await page.evaluate(()=>window.__forcedStampIndexFailures),1,'the optional metadata helper actually failed');
  assert.equal(await page.getByLabel('Beteckning kort 1',{exact:true}).inputValue(),'GS88','the embedded card identity survives');
  assert.equal(await page.getByLabel('Arbetsrader kort 1',{exact:true}).inputValue(),input.readTestData.cards['saved-card'].work.join('\n'),'the embedded work rows survive');
  assert.equal(await page.locator('.rtMatchRow').count(),2,'both reviewed candidate positions restore');
  assert.equal(await page.locator('.rtMatchRow input:checked').count(),1,'the excluded candidate remains excluded');
  assert.match(await page.locator('#rtStatus').textContent(),/Sparad avläsning hittad/,'the UI recognizes the saved project');
  await page.locator('#rtMatchApproval').check();await page.locator('#rtStart').click();
  await page.waitForFunction(()=>window.SmartMatchAppBridge?.getPdf()&&document.getElementById('pwScanOverlay').hidden,null,{timeout:60000});
  const restored=await page.evaluate(()=>SmartMatchReadTest.payload());
  assert.deepEqual(restored.checks,input.readTestData.checks,'saved per-door checks survive optional index failure');
  assert.deepEqual(restored.matching,input.readTestData.matching,'the reviewed positions survive exactly');
  assert.deepEqual(restored.cards,input.readTestData.cards,'source card regions and work are retained');
  const positions=await page.evaluate(()=>SmartMatchAppBridge.getPositions());assert.equal(positions.length,1,'only the selected reviewed position becomes a door');
  assert.equal(positions[0].code,'GS88');assert.equal(positions[0].id,'scan:GS88@1:60,640,120,665');
  await page.locator('#pwMarkers [data-position-id="'+positions[0].id+'"]').evaluate(node=>node.click());await page.waitForSelector('#pwProtocol[open]');
  assert.equal(await page.locator('.rtWorkRow input').count(),3);assert(await page.locator('.rtWorkRow input').first().isChecked(),'the restored check is visible on its physical door');
  assert.match(await page.locator('#pwProtocolPercent').textContent(),/33%/,'restored work retains its progress');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('PASS optional stamp-index failure: embedded code, work, source regions, reviewed exclusions and per-door checks restore without rescanning');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
