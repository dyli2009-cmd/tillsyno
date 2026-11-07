/* TEST 9.14 visual/accessibility regression for the relink review on
 * desktop, iPad and iPhone. Generated PDF fixture only.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PDFDocument,StandardFonts,PDFName,PDFHexString,rgb}=require('../vendor/pdf-lib.min.js');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..');
const sample={page:1,rect:{x:70/900,y:110/600,w:100/900,h:80/600}};
const linkedId='scan:WC@1:linked',removedId='scan:WC@1:removed';
const server=http.createServer((request,response)=>{
 const filename=path.resolve(root,decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,''));
 if(!filename.startsWith(root+path.sep)){response.writeHead(403);return response.end();}
 try{response.setHeader('Content-Type',({'.js':'application/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm'})[path.extname(filename)]||'application/octet-stream');response.end(fs.readFileSync(filename));}
 catch(_){response.writeHead(404);response.end();}
});
const url=()=>`http://127.0.0.1:${server.address().port}/smartmatch-read-test-v9-14.html`;
const clone=value=>JSON.parse(JSON.stringify(value));
const pdfBox=rect=>({x:rect[0]/900,y:(600-rect[3])/600,w:(rect[2]-rect[0])/900,h:(rect[3]-rect[1])/600});
function readHit(id,rect,selected){return {positionId:id,page:1,code:'WC',rect,box:pdfBox(rect),selected,source:'PDF-text',scanSource:'read-tool-v9',sourceKind:'project-code',order:id===linkedId?1:2,label:'WC'};}
async function fixture(){
 const document=await PDFDocument.create(),font=await document.embedFont(StandardFonts.Helvetica),yellow=rgb(1,.9,.02),plan=document.addPage([900,600]);
 function stamp(x){plan.drawEllipse({x,y:450,xScale:45,yScale:34,color:yellow});plan.drawText('WC',{x:x-font.widthOfTextAtSize('WC',18)/2,y:444,size:18,font});}
 stamp(120);stamp(300);
 const card=document.addPage([595,842]);card.drawText('Dörrkort WC',{x:60,y:790,size:16,font});card.drawText('Beslagskod: WC',{x:60,y:750,size:20,font});card.drawText('Låshus SL660 GS',{x:60,y:670,size:15,font});card.drawText('Dörrstängare BC700 GS',{x:60,y:630,size:15,font});
 const codeRect={x:.08,y:.08,w:.80,h:.06},tableRect={x:.08,y:.16,w:.80,h:.25},bounds={x:.06,y:.06,w:.86,h:.40};
 const work=['Låshus · SL660','Dörrstängare · BC700'],workItems=[
  {key:'wc-lock',text:work[0],label:'Låshus',value:'SL660',section:'Daglåsning',sectionKey:'daglasning'},
  {key:'wc-close',text:work[1],label:'Dörrstängare',value:'BC700',section:'Övrigt',sectionKey:'ovrigt'}
 ];
 const cardData={id:'card:WC',page:2,code:'WC',originalCardCode:'WC',header:'Beslagskod: WC',rawTable:'Låshus SL660 GS\nDörrstängare BC700 GS',work,workItems,workState:'ready',workPolicy:'gs-install-v2',codeRect,tableRect,bounds,choices:['WC'],method:'PDF-text',confidence:100};
 // Broad stored rectangles intentionally cover the exact native-text hits.
 // That mirrors an old saved scan whose hit rectangle can differ slightly
 // from the current renderer while still naming the same physical stamp.
 const linkedRect=[70,410,170,500],removedRect=[250,410,350,500],linked=readHit(linkedId,linkedRect,true),removed=readHit(removedId,removedRect,false);
 const checks={'wc-lock':true,'wc-close':false};
 const readTestData={schema:1,phase:'full',sourceId:'generated:relink-v9-14',rects:{code:codeRect,table:tableRect},pages:[2],cards:{[cardData.id]:cardData},checks:{[linkedId]:checks},matching:{version:2,hits:[linked,removed],pages:[{page:1,count:2,imageSkipped:true}],warnings:[],imageMode:'text',review:{version:1,approved:true}},removedReadPositions:[{id:removedId,page:1,code:'WC',rect:removedRect}],drawingSample:null,name:'Generated removed WC relink'};
 const payload={schema:6,projectId:'project:generated-relink-v9-14',projectRevision:1,sourceName:'generated-relink.pdf',manualPositions:[],positionEdits:{[removedId]:{deleted:true}},ignoredCodes:[],labManualLinks:{},instances:{[linkedId]:{checks:clone(checks),rowStages:{'wc-lock':'done'},progress:50,overrides:{'wc-lock':{minutes:17}},customItems:[]}},automationItems:[],readTestData};
 document.catalog.set(PDFName.of('TillsynoSmartMatchV36Data'),PDFHexString.fromText(JSON.stringify(payload)));
 document.catalog.set(PDFName.of('TillsynoSmartMatchV30Data'),PDFHexString.fromText(JSON.stringify(payload)));
 return Buffer.from(await document.save());
}
async function contextFor(browser){
 const context=await browser.newContext({viewport:{width:1366,height:900},acceptDownloads:true});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__relinkCalls={scans:0,workers:0,work:0};
  window.Tesseract={async createWorker(){__relinkCalls.workers++;throw Error('Native WC relink must never initialize OCR');}};
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:value=>{matcher={...value,scan:async(...args)=>{__relinkCalls.scans++;return value.scan(...args);}};}});
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:value=>{work={...value,read:async(...args)=>{__relinkCalls.work++;throw Error('Relinking a stamp must not reread door-card products');}};}});
 });
 return context;
}
async function openProject(page,bytes,count){
 await page.locator('#pwFile').setInputFiles({name:'generated-removed-wc.pdf',mimeType:'application/pdf',buffer:bytes});
 await page.waitForFunction(expected=>window.SmartMatchAppBridge?.getPdf()&&SmartMatchAppBridge.getPositions().length===expected&&document.getElementById('pwScanOverlay').hidden,count,{timeout:60000});
}
async function openReview(page){
 await page.evaluate(()=>SmartMatchReadExtraV94.open({markFirst:false}));
 await page.waitForSelector('#exDialog[open]');
 await page.evaluate(mark=>SmartMatchReadExtraV94.setSample(mark),sample);
 await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy);
 await page.locator('#exCardPage').selectOption('2');
 assert.equal(await page.locator('#exCardCode').inputValue(),'WC');
}
async function search(page){
 await page.locator('#exSearch').click();
 await page.waitForFunction(()=>!SmartMatchReadExtraV94.state().busy,null,{timeout:60000});
 return page.locator('#exResultSummary').innerText();
}
function assertCounts(text,{total,linked,unlinked,removed}){
 assert.match(text,new RegExp('Totalt\\s+'+total,'i'));
 assert.match(text,new RegExp('Kopplade\\s+'+linked,'i'));
 assert.match(text,new RegExp('Okopplade\\s+'+unlinked,'i'));
 if(removed!==undefined)assert.match(text,new RegExp('Tidigare borttagna\\s+'+removed,'i'));
}
async function visualContextFor(browser,device){
 const context=await browser.newContext({viewport:device.viewport,isMobile:!!device.isMobile,hasTouch:!!device.hasTouch,deviceScaleFactor:device.deviceScaleFactor||1,acceptDownloads:true,serviceWorkers:'block'});
 await context.route('**/auth/guard.js*',route=>route.fulfill({contentType:'application/javascript',body:"document.addEventListener('DOMContentLoaded',()=>document.documentElement.removeAttribute('data-auth-pending'));"}));
 await context.addInitScript(()=>{
  window.showSaveFilePicker=undefined;window.__relinkCalls={scans:0,workers:0,work:0};
  window.Tesseract={async createWorker(){__relinkCalls.workers++;throw Error('Native WC relink must never initialize OCR');}};
  let matcher;Object.defineProperty(window,'SmartMatchReadMatcher',{configurable:true,get:()=>matcher,set:value=>{matcher={...value,scan:async(...args)=>{__relinkCalls.scans++;return value.scan(...args);}};}});
  let work;Object.defineProperty(window,'SmartMatchReadWork',{configurable:true,get:()=>work,set:value=>{work={...value,read:async()=>{__relinkCalls.work++;throw Error('No work read');}};}});
 });
 return context;
}
function contrast(rgb1,rgb2){
 const parse=value=>{const nums=(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);return nums.map(n=>{const c=n/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);});};
 const a=parse(rgb1),b=parse(rgb2),lum=v=>.2126*v[0]+.7152*v[1]+.0722*v[2],l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const input=await fixture(),devices=[
   {name:'desktop',viewport:{width:1440,height:1000}},
   {name:'ipad',viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2},
   {name:'iphone',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}
  ],report=[];
  for(const device of devices){
   const context=await visualContextFor(browser,device),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(url());await openProject(page,input,1);await openReview(page);const summaryText=await search(page);assertCounts(summaryText,{total:2,linked:1,unlinked:1,removed:1});
   const initial=await page.evaluate(()=>{
    const d=document.getElementById('exDialog'),s=document.getElementById('exResultSummary'),rows=[...document.querySelectorAll('#exHits .exHit')],a=document.getElementById('exApply'),box=e=>{const r=e.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)}};
    const db=box(d),inside=e=>{const r=e.getBoundingClientRect();return r.top>=db.y&&r.bottom<=db.bottom&&r.left>=db.x&&r.right<=db.right;};
    return {dialog:db,dialogScrollTop:d.scrollTop,dialogClient:{width:d.clientWidth,height:d.clientHeight},dialogScroll:{width:d.scrollWidth,height:d.scrollHeight},summary:box(s),summaryVisible:inside(s),rows:rows.map(box),rowVisible:rows.map(inside),apply:box(a),applyVisible:inside(a),document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth},viewport:{innerWidth,innerHeight,visualWidth:visualViewport?.width||null,visualHeight:visualViewport?.height||null}};
   });
   await page.locator('#exResultSummary').scrollIntoViewIfNeeded();
   if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v914-relink-'+device.name+'.png',animations:'disabled'});
   await page.locator('#exHits .exHit').last().scrollIntoViewIfNeeded();
   if(process.env.SMARTMATCH_SCREENSHOTS)await page.screenshot({path:'/tmp/smartmatch-v914-relink-'+device.name+'-rows.png',animations:'disabled'});
   const metrics=await page.evaluate(()=>{
    const d=document.getElementById('exDialog'),s=document.getElementById('exResultSummary'),rows=[...document.querySelectorAll('#exHits .exHit')],checks=rows.map(r=>r.querySelector('input[type=checkbox]')),buttons=rows.map(r=>r.querySelector('button')),apply=document.getElementById('exApply'),box=e=>{const r=e.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)}};
    const db=box(d),isWithin=e=>{const r=e.getBoundingClientRect();return r.left>=db.x-1&&r.right<=db.right+1;};
    const overflow=[...d.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left<db.x-1||r.right>db.right+1);}).map(e=>({id:e.id||'',class:e.className||'',tag:e.tagName,box:box(e)}));
    const ss=getComputedStyle(s),small=getComputedStyle(rows[0].querySelector('small')),text=getComputedStyle(rows[0].querySelector('span'));
    return {dialog:db,client:{width:d.clientWidth,height:d.clientHeight},scroll:{width:d.scrollWidth,height:d.scrollHeight,top:d.scrollTop},summary:{box:box(s),text:s.innerText,fontSize:ss.fontSize,lineHeight:ss.lineHeight,color:ss.color,background:ss.backgroundColor},rows:rows.map((r,i)=>({status:r.dataset.status,box:box(r),horizontalFit:isWithin(r),labelBox:box(r.querySelector('label')),textBox:box(r.querySelector('span')),smallBox:box(r.querySelector('small')),checkboxBox:box(checks[i]),disabled:checks[i].disabled,checked:checks[i].checked,accessibleName:checks[i].labels?.[0]?.innerText?.trim()||'',buttonBox:box(buttons[i]),buttonText:buttons[i].innerText})),fonts:{row:text.fontSize,small:small.fontSize,smallLineHeight:small.lineHeight,smallColor:small.color,rowBackground:getComputedStyle(rows[0]).backgroundColor||getComputedStyle(d).backgroundColor,dialogBackground:getComputedStyle(d).backgroundColor},overflow,document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth},apply:{box:box(apply),disabled:apply.disabled,text:apply.innerText}};
   });
   metrics.contrastSmall=contrast(metrics.fonts.smallColor,metrics.fonts.dialogBackground);metrics.initial=initial;metrics.errors=errors;
   assert.equal(metrics.scroll.width,metrics.client.width,device.name+' dialog has no horizontal overflow');assert.equal(metrics.document.scrollWidth,metrics.document.clientWidth,device.name+' document has no horizontal overflow');assert.deepEqual(errors,[]);
   assert.equal(metrics.rows.length,2);assert.equal(metrics.rows[0].status,'linked');assert.equal(metrics.rows[1].status,'removed');assert.equal(metrics.rows[0].disabled,true);assert.equal(metrics.rows[0].checked,false);assert.equal(metrics.rows[1].disabled,false);assert.equal(metrics.rows[1].checked,true);
   assert.match(metrics.rows[0].accessibleName,/Redan kopplad/i);assert.match(metrics.rows[1].accessibleName,/Tidigare borttagen.+kan kopplas igen/i);assert(metrics.rows.every(r=>r.horizontalFit));assert(metrics.rows.every(r=>r.labelBox.height>=44),device.name+' checkbox labels must provide 44px tap targets');assert(metrics.rows.every(r=>r.buttonBox.height>=44),device.name+' Visa buttons must provide 44px tap targets');assert(metrics.overflow.length===0,device.name+' child overflow '+JSON.stringify(metrics.overflow));
   assert(Number.parseFloat(metrics.summary.fontSize)>=16,device.name+' summary must stay readable');assert(Number.parseFloat(metrics.fonts.row)>=15,device.name+' row text must stay readable');assert(Number.parseFloat(metrics.fonts.small)>=13,device.name+' status text must stay readable');assert(metrics.contrastSmall>=4.5,device.name+' status text must meet normal-text contrast');
   await page.locator('#exApply').scrollIntoViewIfNeeded();const applyVisible=await page.locator('#exApply').evaluate((e)=>{const r=e.getBoundingClientRect(),d=document.getElementById('exDialog').getBoundingClientRect();return {fullyVisible:r.top>=d.top&&r.bottom<=d.bottom&&r.left>=d.left&&r.right<=d.right,box:{x:r.x,y:r.y,width:r.width,height:r.height},dialog:{x:d.x,y:d.y,width:d.width,height:d.height}};});
   assert(applyVisible.fullyVisible);assert(applyVisible.box.height>=44);metrics.applyAfterScroll=applyVisible;
   report.push({device:device.name,viewport:device.viewport,metrics});await context.close();
  }
  console.log('PASS TEST 9.14 relink layout: desktop 1440x1000, iPad 820x1180 and iPhone 390x844; no horizontal overflow; 15px/13px rows; 44px label and button targets; linked disabled and removed selectable.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
