'use strict';
// Generated two-page PDF only. Tests real PDF.js and pointer geometry without
// any production login, storage, or user-document changes.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const {PDFDocument,StandardFonts,degrees} = require('../vendor/pdf-lib.min.js');
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const root = path.resolve(__dirname,'..');
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0}#host{width:820px;height:620px;position:relative}</style><div id="host"></div><script src="/vendor/pdf.min.js"></script><script src="/smartmatch-projektering-v2-canvas.js"></script><script>
window.errors=[];window.events={select:[],place:[],move:[],erase:[]};
window.state={drawing:{pages:[]},stencils:{GS65:{id:'GS65',code:'GS65',kind:'card',shape:'oval',fill:'#ffdb5c',stroke:'#967b27',textColor:'#263a33',width:64,height:28,fontSize:11}},placements:[]};
window.control=Proj2Canvas.create({host:document.getElementById('host'),onSelect:ids=>events.select.push(ids),onPlace:item=>{events.place.push(item);const p={...item,id:'P'+(events.place.length),code:state.stencils[item.stencilId].code,width:64,height:28,rotation:0,locked:false,note:''};state.placements.push(p);control.setProject(state);},onMove:updates=>{events.move.push(updates);for(const u of updates)Object.assign(state.placements.find(p=>p.id===u.id),u);control.setProject(state);},onErase:ids=>{events.erase.push(ids);state.placements=state.placements.filter(p=>!ids.includes(p.id));control.setProject(state);},onError:e=>errors.push(e.message)});
window.ready=(async()=>{const bytes=new Uint8Array(await(await fetch('/fixture.pdf')).arrayBuffer());window.originalSize=bytes.byteLength;const result=await control.open(bytes);state.drawing=result;control.setProject(state);window.metadata=result;window.originalStillPresent=bytes.byteLength===originalSize;})();
</script>`;
let fixture;
const server = http.createServer((req,res) => {
  const url = new URL(req.url,'http://local');
  if(url.pathname==='/'){res.setHeader('content-type','text/html;charset=utf-8');res.end(html);return;}
  if(url.pathname==='/fixture.pdf'){res.setHeader('content-type','application/pdf');res.end(fixture);return;}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.setHeader('content-type',file.endsWith('.js')?'application/javascript':'application/octet-stream');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}
});
async function idle(page){await page.waitForFunction(()=>!control.snapshot().rendering);await page.waitForTimeout(180);await page.waitForFunction(()=>!control.snapshot().rendering);}
async function at(page,x,y){return page.locator('.p2-canvas-page').evaluate((node,p)=>{const r=node.getBoundingClientRect();return{x:r.left+r.width*p.x,y:r.top+r.height*p.y};},{x,y});}
async function clickAt(page,x,y){const p=await at(page,x,y);await page.mouse.click(p.x,p.y);}
async function selected(page){return page.evaluate(()=>control.snapshot().selectedIds);}
(async()=>{
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
  const a=doc.addPage([600,400]);a.drawText('Sida 1 - ren originalritning',{x:35,y:365,size:18,font});a.drawRectangle({x:50,y:50,width:500,height:280,borderWidth:2});
  const b=doc.addPage([800,600]);b.setCropBox(40,30,600,400);b.setRotation(degrees(90));b.drawText('Sida 2 - roterad och beskuren',{x:65,y:365,size:16,font});
  fixture=Buffer.from(await doc.save());
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1024,height:760},hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.evaluate(()=>ready);await idle(page);
    const meta=await page.evaluate(()=>metadata.pages);
    assert.equal(meta.length,2);assert.deepEqual([meta[0].width,meta[0].height],[600,400]);assert.deepEqual([meta[1].width,meta[1].height,meta[1].rotation],[400,600,90]);assert.deepEqual(meta[1].view,[40,30,640,430]);assert.equal(meta[1].transform.length,6);assert(await page.evaluate(()=>originalStillPresent));
    await page.evaluate(()=>{control.zoomTo(2);control.setTool('place');control.setStencil('GS65');});await idle(page);
    await clickAt(page,.4,.5);
    const placed=await page.evaluate(()=>events.place[0]);assert.equal(placed.page,1);assert.equal(placed.stencilId,'GS65');assert(Math.abs(placed.x-.4)<.002);assert(Math.abs(placed.y-.5)<.002);assert.equal(await page.locator('.stamp-item').count(),1);

    // Anchored wheel zoom leaves the same PDF point beneath the pointer.
    const before=await at(page,.4,.5);await page.mouse.move(before.x,before.y);await page.mouse.wheel(0,-180);await idle(page);
    const anchor=await page.locator('.p2-canvas-page').evaluate((node,p)=>{const r=node.getBoundingClientRect();return{x:(p.x-r.left)/r.width,y:(p.y-r.top)/r.height};},before);
    assert(Math.abs(anchor.x-.4)<.004);assert(Math.abs(anchor.y-.5)<.004);assert((await page.evaluate(()=>control.snapshot().zoom))>2.2);

    // Stamp drag commits one final normalized update; the data changes only in callback.
    await page.evaluate(()=>control.setTool('select'));
    const start=await at(page,.4,.5),end=await at(page,.48,.57);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();
    const moved=await page.evaluate(()=>state.placements[0]);assert(Math.abs(moved.x-.48)<.004);assert(Math.abs(moved.y-.57)<.004);assert.equal(await page.evaluate(()=>events.move.length),1);assert.deepEqual(await selected(page),['P1']);

    // A locked stamp remains selectable and cannot be dragged.
    await page.evaluate(()=>{state.placements[0].locked=true;control.setProject(state);});
    const lockedStart=await at(page,.48,.57),lockedEnd=await at(page,.54,.61);
    await page.mouse.move(lockedStart.x,lockedStart.y);await page.mouse.down();await page.mouse.move(lockedEnd.x,lockedEnd.y,{steps:5});await page.mouse.up();
    assert.equal(await page.evaluate(()=>events.move.length),1);assert.equal((await page.evaluate(()=>state.placements[0])).x,moved.x);
    await page.evaluate(()=>control.setTool('erase'));await clickAt(page,moved.x,moved.y);assert.equal(await page.evaluate(()=>events.erase.length),0,'erase selects a locked stamp without deleting it');await page.evaluate(()=>control.setTool('select'));

    // HTML5 stencil drag and drop uses the page bounds, including current zoom/pan.
    await page.evaluate(()=>{const r=document.querySelector('.p2-canvas-page').getBoundingClientRect(),transfer=new DataTransfer();transfer.setData('application/x-tillsyno-stencil','GS65');document.querySelector('.p2-canvas-scroller').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer,clientX:r.left+r.width*.60,clientY:r.top+r.height*.60}));});
    const dropped=await page.evaluate(()=>events.place[1]);assert(Math.abs(dropped.x-.60)<.004);assert(Math.abs(dropped.y-.60)<.004);
    await page.evaluate(()=>{control.setTool('select');control.setSelection(['P1']);});
    const second=await at(page,.60,.60);await page.keyboard.down('Shift');await page.mouse.click(second.x,second.y);await page.keyboard.up('Shift');assert.deepEqual((await selected(page)).sort(),['P1','P2']);

    // Glyphs stay readable while placement and shape geometry retain their
    // actual rotation. This matches the exported PDF at the 90/270 boundaries.
    for(const shape of ['oval','square','rectangle'])for(const angle of [90,180,225,270,271]){
      const result=await page.evaluate(({shape,angle})=>{
        const item=state.placements[0],geometry={x:item.x,y:item.y,width:item.width,height:item.height};state.stencils.GS65.shape=shape;item.rotation=angle;control.setProject(state);
        const node=document.querySelector('[data-placement-id="P1"]');
        return{geometry,after:{x:item.x,y:item.y,width:item.width,height:item.height},rotation:item.rotation,group:node.getAttribute('transform'),text:node.querySelector(':scope>text').getAttribute('transform')};
      },{shape,angle});
      assert.deepEqual(result.after,result.geometry);assert.equal(result.rotation,angle);assert(result.group.endsWith('rotate('+angle+')'));
      assert.equal(result.text,angle>90&&angle<=270?'rotate(180)':null);
    }
    await page.evaluate(()=>{state.placements[0].rotation=0;state.stencils.GS65.shape='oval';control.setProject(state);});

    // Hand pan does not place a stamp and scrolls the magnified drawing.
    await page.evaluate(()=>control.setTool('pan'));const scrollBefore=await page.evaluate(()=>control.snapshot().scroll.left);await page.mouse.move(400,280);await page.mouse.down();await page.mouse.move(340,245,{steps:6});await page.mouse.up();assert((await page.evaluate(()=>control.snapshot().scroll.left))>scrollBefore+30);assert.equal(await page.evaluate(()=>events.place.length),2);

    await page.evaluate(()=>control.page(2));await idle(page);assert.equal(await page.locator('.stamp-item').count(),0);assert.equal(await page.evaluate(()=>control.snapshot().page),2);
    await page.evaluate(()=>{control.fit();control.setTool('place');});await idle(page);
    await clickAt(page,.5,.5);const rotated=await page.evaluate(()=>events.place.at(-1));assert.equal(rotated.page,2);assert(Math.abs(rotated.x-.5)<.004);assert(Math.abs(rotated.y-.5)<.004);
    await page.evaluate(()=>control.setTool('erase'));await clickAt(page,.5,.5);assert.deepEqual(await page.evaluate(()=>events.erase.at(-1)),['P3']);assert.equal(await page.locator('.stamp-item').count(),0);

    // Two-finger pinch zooms and never converts the first finger into a stamp.
    await page.evaluate(()=>control.setTool('place'));const pinchBefore=await page.evaluate(()=>control.snapshot().zoom),placeBefore=await page.evaluate(()=>events.place.length);
    const touch=await context.newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:350,y:270,id:1},{x:470,y:350,id:2}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:300,y:230,id:1},{x:520,y:390,id:2}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();await idle(page);
    assert((await page.evaluate(()=>control.snapshot().zoom))>pinchBefore*1.2);assert.equal(await page.evaluate(()=>events.place.length),placeBefore);

    // Superseded asynchronous opens cannot return stale page metadata.
    const races=await page.evaluate(async()=>{const bytes=new Uint8Array(await(await fetch('/fixture.pdf')).arrayBuffer());return(await Promise.allSettled([control.open(bytes),control.open(bytes)])).map(result=>result.status);});
    assert.deepEqual(races,['rejected','fulfilled']);await idle(page);assert.equal(await page.evaluate(()=>control.snapshot().total),2);

    // Reopening another page then a failed PDF leaves a working existing document.
    await page.evaluate(()=>control.page(1));await idle(page);
    const failed=await page.evaluate(async()=>{try{await control.open(new Uint8Array([1,2,3]));return false;}catch(_){return true;}});assert(failed);assert.equal(await page.evaluate(()=>control.snapshot().total),2);await page.evaluate(()=>control.page(2));await idle(page);
    await page.evaluate(()=>control.open(new Uint8Array()));assert.equal(await page.evaluate(()=>control.snapshot().total),0);assert.equal(await page.locator('.p2-canvas-page').isVisible(),false);
    await page.evaluate(()=>control.destroy());assert.equal(await page.locator('#host').innerHTML(),'');assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.errors),[]);
    console.log('PASS projection canvas: real multipage PDF, rotated crop metadata, original byte retention, anchored wheel zoom, drag/drop, move, lock, multi-select, readable rotated glyphs, pan, erase, pinch, stale-open and failed-open preservation, clear.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
