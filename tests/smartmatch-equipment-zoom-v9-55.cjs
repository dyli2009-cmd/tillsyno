'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});try{
 for(const agent of ['iPad','iPhone','Desktop']){
  const context=await browser.newContext({userAgent:agent}),page=await context.newPage();
  await page.setContent('<div id="pwStage" style="position:relative;width:800px;height:600px"><canvas id="pwCanvas"></canvas><div id="pwMarkers"></div><span id="pwPageInfo"></span></div>');
  await page.evaluate(()=>{window.testScale=1;const pdf={numPages:1,getPage:async()=>({getViewport:({scale})=>({scale,convertToViewportPoint:(x,y)=>[x*scale,y*scale]})})};window.SmartMatchAppBridge={getPdf:()=>pdf,getPage:()=>1,getScale:()=>testScale,getReadStampIndex:()=>['DA','DS'].map((subject,i)=>({id:subject,page:1,subtype:'Stamp',subject,rect:[100+i*100,100,120+i*100,120]}))};window.SmartMatchReadTest={isCardPage:()=>false};});
  await page.addScriptTag({content:fs.readFileSync(require.resolve('../smartmatch-read-equipment-symbols-v9-55.js'),'utf8')});
  for(const [scale,width] of [[2,14],[1,7],[.5,3.5],[.2,0],[3,14]]){
   await page.evaluate(async scale=>{testScale=scale;await SmartMatchEquipmentSymbols.refresh()},scale);
   const sizes=await page.locator('.smEquipmentSymbol').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
   if(agent==='Desktop'||!width)assert.equal(sizes.length,0);else{assert.equal(sizes.length,2);for(const size of sizes)assert(Math.abs(size-width)<.1,JSON.stringify({agent,scale,width,size}))}
  }
  await context.close();
 }console.log('PASS: iPad/iPhone symbols shrink with zoom, disappear at overview, cap at 14px; desktop remains hidden');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
