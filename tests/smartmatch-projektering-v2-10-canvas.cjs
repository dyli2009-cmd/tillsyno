'use strict';
// Generated two-page PDF only. Tests real PDF.js and pointer geometry without
// any production login, storage, or user-document changes.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const {PDFDocument,StandardFonts,degrees} = require('../vendor/pdf-lib.min.js');
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const root = path.resolve(__dirname,'..');
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0}#host{width:820px;height:620px;position:relative}</style><div id="host"></div><script src="/vendor/pdf.min.js"></script><script src="/smartmatch-projektering-v2-10-canvas.js"></script><script>
window.errors=[];window.events={select:[],place:[],move:[],erase:[],resize:[],context:[],activate:[]};
window.state={preferences:{sizeScope:'doors'},drawing:{pages:[]},stencils:{GS65:{id:'GS65',code:'GS65',kind:'card',shape:'oval',fill:'#ffdb5c',stroke:'#967b27',textColor:'#263a33',width:64,height:28,fontSize:11}},placements:[]};
window.control=Proj2Canvas.create({touchTapOpens:new URL(location.href).searchParams.has('single'),host:document.getElementById('host'),onSelect:ids=>{events.select.push(ids);control.setProject(state);},onPlace:item=>{events.place.push(item);const p={...item,id:'P'+(events.place.length),code:state.stencils[item.stencilId].code,width:64,height:28,rotation:0,locked:false,note:''};state.placements.push(p);control.setProject(state);},onMove:updates=>{events.move.push(updates);for(const u of updates)Object.assign(state.placements.find(p=>p.id===u.id),u);control.setProject(state);},onErase:ids=>{events.erase.push(ids);state.placements=state.placements.filter(p=>!ids.includes(p.id));control.setProject(state);},onResize:item=>events.resize.push(item),onContext:item=>events.context.push(item),onActivate:item=>events.activate.push(item),onError:e=>errors.push(e.message)});
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

    // Placement mode remains active after choosing a stencil. Existing stamps
    // must still drag, and commit one final normalized update.
    const start=await at(page,.4,.5),end=await at(page,.48,.57);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();
    const moved=await page.evaluate(()=>state.placements[0]);assert(Math.abs(moved.x-.48)<.004);assert(Math.abs(moved.y-.57)<.004);assert.equal(await page.evaluate(()=>events.move.length),1);assert.deepEqual(await selected(page),['P1']);
    assert.equal(await page.evaluate(()=>control.snapshot().tool),'place');

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

    // Empty drags pan with the mouse in select and place, without choosing hand.
    // A place-mode drag must never create a stamp at the release point.
    for(const mode of ['select','place']){
      await page.evaluate(mode=>{control.setTool(mode);const s=document.querySelector('.p2-canvas-scroller');s.scrollLeft=180;s.scrollTop=100;},mode);
      const before=await page.evaluate(()=>({scroll:control.snapshot().scroll,count:events.place.length}));
      await page.mouse.move(680,150);await page.mouse.down();await page.mouse.move(620,115,{steps:6});await page.mouse.up();
      const after=await page.evaluate(()=>({scroll:control.snapshot().scroll,count:events.place.length}));
      assert(after.scroll.left>before.scroll.left+40,mode+' background drag pans');assert.equal(after.count,before.count);
    }

    // Exact oval geometry does not steal clicks in its blank bounding corners;
    // selection follows the ellipse. Handles stay 9 CSS pixels across zooms.
    await page.evaluate(()=>{window.saved=structuredClone(state);state.placements=[{...state.placements[1],id:'A',page:1,x:.35,y:.45,rotation:0,width:64,height:28}];control.setProject(state,{selectedIds:['A']});control.fit();control.setTool('select');});await idle(page);
    const shapeHit=await page.evaluate(()=>{
      const group=document.querySelector('.stamp-item'),rect=group.getBoundingClientRect(),matrix=group.getScreenCTM();
      const at=(x,y)=>new DOMPoint(x,y).matrixTransform(matrix),corner=at(64*.45,28*.45),center=at(0,0);
      return{corner:document.elementFromPoint(corner.x,corner.y)?.closest('[data-placement-id]')?.dataset.placementId||null,center:document.elementFromPoint(center.x,center.y)?.closest('[data-placement-id]')?.dataset.placementId,outline:group.querySelector('.p2-stamp-selection').tagName,extraHits:group.querySelectorAll('.p2-stamp-hit').length,handles:group.querySelectorAll('[data-resize-handle]').length};
    });
    assert.equal(shapeHit.corner,null);assert.equal(shapeHit.center,'A');assert.equal(shapeHit.outline,'ellipse');assert.equal(shapeHit.extraHits,0);assert.equal(shapeHit.handles,4);
    for(const zoom of [.5,2,4]){
      await page.evaluate(zoom=>control.zoomTo(zoom),zoom);await idle(page);
      const diameter=await page.locator('[data-resize-handle=e]').evaluate(node=>node.getBoundingClientRect().width);assert(Math.abs(diameter-9)<.05);
    }
    // On phone-sized fit views a short oval can be smaller than its handles.
    // Their fixed screen radius must never cover its clickable center.
    await page.evaluate(()=>{document.getElementById('host').style.width='390px';document.getElementById('host').style.height='150px';control.fit();});await idle(page);
    const tinyCenter=await at(page,.35,.45),tinyTarget=await page.evaluate(p=>{const node=document.elementFromPoint(p.x,p.y);return{id:node?.closest('[data-placement-id]')?.dataset.placementId,handle:node?.closest('[data-resize-handle]')?.dataset.resizeHandle||null};},tinyCenter);
    assert.equal(tinyTarget.id,'A');assert.equal(tinyTarget.handle,null,'fixed-size resize handles leave selected tiny stamp center clear');
    await page.evaluate(()=>{window.tinyTrace=[];for(const type of ['pointerdown','pointerup','pointercancel'])document.querySelector('.p2-canvas-scroller').addEventListener(type,event=>tinyTrace.push({type,id:event.pointerId,pointer:event.pointerType,target:event.target.tagName,handle:event.target.closest('[data-resize-handle]')?.dataset.resizeHandle,placement:event.target.closest('[data-placement-id]')?.dataset.placementId,x:event.clientX,y:event.clientY}),{capture:true});});
    const tinyTouch=await context.newCDPSession(page),tinyBefore=await page.evaluate(()=>events.activate.length);
    for(let i=0;i<2;i++){await tinyTouch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tinyCenter.x,y:tinyCenter.y,id:19}]});await tinyTouch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    await tinyTouch.detach();assert.equal(await page.evaluate(()=>events.activate.length),tinyBefore+1,'tiny selected oval double tap opens the card '+JSON.stringify(await page.evaluate(()=>tinyTrace)));
    await page.evaluate(()=>{document.getElementById('host').style.width='820px';document.getElementById('host').style.height='620px';});
    await page.evaluate(()=>control.fit());await idle(page);

    // Right-click keeps an existing multi-selection and includes normalized
    // coordinates. Browser menus are suppressed on the canvas.
    await page.evaluate(()=>{state.stencils.GS2={...state.stencils.GS65,id:'GS2',code:'GS2'};state.stencils.DS={...state.stencils.GS65,id:'DS',code:'DS',kind:'symbol',shape:'square'};const p=state.placements[0];state.placements.push({...p,id:'B',code:'GS2',stencilId:'GS2',x:.65,y:.55},{...p,id:'C',code:'GS65',page:2,x:.5,y:.5},{...p,id:'D',code:'DS',stencilId:'DS',x:.6,y:.2});control.setProject(state,{selectedIds:['A','B']});});
    const contextPoint=await at(page,.35,.45);await page.mouse.click(contextPoint.x,contextPoint.y,{button:'right'});
    const contextEvent=await page.evaluate(()=>events.context.at(-1));assert.deepEqual(contextEvent.ids,['A','B']);assert.equal(contextEvent.page,1);assert(Math.abs(contextEvent.x-.35)<.002);assert(Math.abs(contextEvent.y-.45)<.002);
    await clickAt(page,.05,.06);const blank=await at(page,.05,.06);await page.mouse.click(blank.x,blank.y,{button:'right'});assert.deepEqual(await page.evaluate(()=>events.context.at(-1).ids),[]);
    const selectsBeforeContext=await page.evaluate(()=>events.select.length);await page.mouse.click(contextPoint.x,contextPoint.y,{button:'right'});assert.equal(await page.evaluate(()=>events.select.length),selectsBeforeContext,'context emits one callback without a prior selection callback');assert.deepEqual(await selected(page),['A']);
    await page.locator('[data-placement-id=B]').focus();const selectsBeforeEnter=await page.evaluate(()=>events.select.length);await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>events.select.length),selectsBeforeEnter,'Enter activation is atomic');assert.deepEqual(await page.evaluate(()=>events.activate.at(-1)),{id:'B'});

    // Root may rebuild SVG during onSelect. Two completed taps still activate
    // exactly once; a single pointer-down never opens the card.
    const activateBefore=await page.evaluate(()=>events.activate.length),aPoint=await at(page,.35,.45);
    await page.mouse.move(aPoint.x,aPoint.y);await page.mouse.down();assert.equal(await page.evaluate(()=>events.activate.length),activateBefore);await page.mouse.up();
    await page.mouse.click(aPoint.x,aPoint.y);assert.equal(await page.evaluate(()=>events.activate.length),activateBefore+1);assert.deepEqual(await page.evaluate(()=>events.activate.at(-1)),{id:'A'});

    // Shared resize previews all card codes on this page and leaves input
    // state untouched. A single final callback also covers other pages.
    await page.evaluate(()=>{control.setSelection(['A']);state.preferences.sizeScope='doors';});
    let handle=await page.locator('[data-placement-id=A] [data-resize-handle=e]').boundingBox();
    const source=await page.evaluate(()=>JSON.stringify(state));
    await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+22,handle.y+handle.height/2,{steps:6});
    assert.equal(await page.evaluate(()=>events.resize.length),0);assert.equal(await page.evaluate(()=>JSON.stringify(state)),source);
    const previews=await page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.stamp-item')].map(node=>{const shape=node.querySelector('ellipse,rect');return[node.dataset.placementId,shape.tagName==='ellipse'?Number(shape.getAttribute('rx'))*2:Number(shape.getAttribute('width'))];})));
    assert(previews.A>64);assert(Math.abs(previews.A-previews.B)<.001);assert.equal(previews.D,64);
    await page.mouse.up();const resized=await page.evaluate(()=>events.resize.at(-1));assert.equal(resized.id,'A');assert.equal(resized.scope,'doors');assert(Math.abs(resized.width/resized.height-64/28)<1e-9);assert.equal(await page.evaluate(()=>JSON.stringify(state)),source);

    // Scope single isolates its preview. A rotated handle measures movement
    // in the stamp's local axes, not the page axes.
    await page.evaluate(()=>{state.preferences.sizeScope='single';state.placements[0].rotation=90;control.setProject(state,{selectedIds:['A']});});
    handle=await page.locator('[data-placement-id=A] [data-resize-handle=e]').boundingBox();
    const z=await page.evaluate(()=>control.snapshot().zoom);await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2+16*z,{steps:6});await page.mouse.up();
    const rotatedResize=await page.evaluate(()=>events.resize.at(-1));assert.equal(rotatedResize.scope,'single');assert(Math.abs(rotatedResize.width-96)<.2);assert(Math.abs(rotatedResize.height-42)<.1);

    // A target on a different, rotated/cropped page limits global size, even
    // though it has no DOM node on the current page.
    await page.evaluate(()=>{state.preferences.sizeScope='doors';state.placements[0].rotation=0;state.placements.find(p=>p.id==='C').x=.09;control.setProject(state,{selectedIds:['A']});});
    handle=await page.locator('[data-placement-id=A] [data-resize-handle=e]').boundingBox();
    await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+150,handle.y+handle.height/2,{steps:6});await page.mouse.up();
    assert(Math.abs((await page.evaluate(()=>events.resize.at(-1))).width-72)<.2);

    // Locks block the entire shared operation, and keyboard handles provide
    // the same final callback without a mouse.
    await page.evaluate(()=>{state.placements.find(p=>p.id==='B').locked=true;control.setProject(state,{selectedIds:['A']});});
    const resizeCount=await page.evaluate(()=>events.resize.length);handle=await page.locator('[data-placement-id=A] [data-resize-handle=e]').boundingBox();
    await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+20,handle.y+handle.height/2,{steps:4});await page.mouse.up();
    assert.equal(await page.evaluate(()=>events.resize.length),resizeCount);assert.match(await page.evaluate(()=>window.errors.pop()),/Lås upp/);
    await page.evaluate(()=>{state.preferences.sizeScope='single';state.placements[0].rotation=90;control.setProject(state,{selectedIds:['A']});});
    await page.locator('[data-placement-id=A] [data-resize-handle=e]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>events.resize.length),resizeCount+1);assert(Math.abs((await page.evaluate(()=>events.resize.at(-1))).width-65)<.1);

    // Shift+background retains rectangle selection even in placement mode.
    await page.evaluate(()=>{control.setSelection([]);control.setTool('place');});
    const boxStart=await at(page,.2,.35),boxEnd=await at(page,.75,.65);
    await page.keyboard.down('Shift');await page.mouse.move(boxStart.x,boxStart.y);await page.mouse.down();await page.mouse.move(boxEnd.x,boxEnd.y,{steps:6});await page.mouse.up();await page.keyboard.up('Shift');assert.deepEqual((await selected(page)).sort(),['A','B']);

    // Double tap is tracked by placement identity rather than SVG DOM nodes.
    const tap=await context.newCDPSession(page),tapStart=await at(page,.35,.45),tapBefore=await page.evaluate(()=>events.activate.length);
    for(let i=0;i<2;i++){await tap.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tapStart.x,y:tapStart.y,id:11}]});await tap.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    await tap.detach();assert.equal(await page.evaluate(()=>events.activate.length),tapBefore+1);

    // Restore the original scenario before continuing PDF and touch checks.
    await page.evaluate(()=>{state=window.saved;control.setProject(state);control.zoomTo(2.5);});await idle(page);
    await page.evaluate(()=>{control.setTool('place');const s=document.querySelector('.p2-canvas-scroller');s.scrollLeft=180;s.scrollTop=100;});
    const oneFinger=await context.newCDPSession(page),touchBefore=await page.evaluate(()=>({scroll:control.snapshot().scroll,count:events.place.length}));
    await oneFinger.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:680,y:150,id:7}]});await oneFinger.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:620,y:115,id:7}]});await oneFinger.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await oneFinger.detach();
    const touchAfter=await page.evaluate(()=>({scroll:control.snapshot().scroll,count:events.place.length}));assert(touchAfter.scroll.left>touchBefore.scroll.left+40);assert.equal(touchAfter.count,touchBefore.count);

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
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
    assert((await page.evaluate(()=>control.snapshot().zoom))>pinchBefore*1.2);assert.equal(await page.evaluate(()=>events.place.length),placeBefore);
    // Pinch guards its trailing tap, but explicitly choosing the placement
    // tool establishes new intent and must allow the very next placement.
    const intentionalPoint=await at(page,.5,.5);
    await page.evaluate(()=>control.setStencil('GS65'));await page.mouse.click(intentionalPoint.x,intentionalPoint.y);
    assert.equal(await page.evaluate(()=>events.place.length),placeBefore,'same-stencil render preserves post-pinch ghost-tap protection');
    await page.evaluate(()=>control.setTool('place'));await page.mouse.click(intentionalPoint.x,intentionalPoint.y);
    assert.equal(await page.evaluate(()=>events.place.length),placeBefore+1,'explicit tool intent permits immediate post-pinch placement');
    await page.evaluate(()=>{state.placements.pop();control.setProject(state);});await idle(page);

    // Replacing the document cancels pending gestures: releasing a tap which
    // began on the previous PDF cannot place onto the new document.
    await page.evaluate(()=>{control.fit();control.setTool('place');});await idle(page);
    const stalePoint=await at(page,.5,.5),stalePlaceCount=await page.evaluate(()=>events.place.length);
    await page.mouse.move(stalePoint.x,stalePoint.y);await page.mouse.down();
    await page.evaluate(async()=>control.open(new Uint8Array(await(await fetch('/fixture.pdf')).arrayBuffer())));await page.mouse.up();await idle(page);
    assert.equal(await page.evaluate(()=>events.place.length),stalePlaceCount);

    // Superseded asynchronous opens cannot return stale page metadata.
    const races=await page.evaluate(async()=>{const bytes=new Uint8Array(await(await fetch('/fixture.pdf')).arrayBuffer());return(await Promise.allSettled([control.open(bytes),control.open(bytes)])).map(result=>result.status);});
    assert.deepEqual(races,['rejected','fulfilled']);await idle(page);assert.equal(await page.evaluate(()=>control.snapshot().total),2);

    // Reopening another page then a failed PDF leaves a working existing document.
    await page.evaluate(()=>control.page(1));await idle(page);
    const failed=await page.evaluate(async()=>{try{await control.open(new Uint8Array([1,2,3]));return false;}catch(_){return true;}});assert(failed);assert.equal(await page.evaluate(()=>control.snapshot().total),2);await page.evaluate(()=>control.page(2));await idle(page);
    await page.evaluate(()=>control.open(new Uint8Array()));assert.equal(await page.evaluate(()=>control.snapshot().total),0);assert.equal(await page.locator('.p2-canvas-page').isVisible(),false);
    await page.evaluate(()=>control.destroy());assert.equal(await page.locator('#host').innerHTML(),'');assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.errors),[]);
    {
    // Native touchscreen path: a completed single tap opens, while the original
    // touched SVG remains connected through every selection/zoom/drag frame.
    await page.goto('http://127.0.0.1:'+server.address().port+'/?single=1');await page.evaluate(()=>ready);await idle(page);
    await page.evaluate(()=>{state.placements=[{id:'TOUCH',page:1,code:'GS65',stencilId:'GS65',x:.45,y:.5,width:64,height:28,rotation:0,locked:false,note:''}];state.preferences.sizeScope='single';control.setProject(state);control.setTool('select');control.zoomTo(1.5);});await idle(page);
    const native=await context.newCDPSession(page);
    const send=(type,points)=>native.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    const touchPoint=async()=>{const p=await page.evaluate(()=>state.placements[0]);return at(page,p.x,p.y);};
    let center=await touchPoint(),before=await page.evaluate(()=>({move:events.move.length,activate:events.activate.length}));
    await page.evaluate(()=>{window.touchedNode=document.querySelector('[data-placement-id=TOUCH]');});
    await send('touchStart',[{x:center.x,y:center.y,id:31}]);
    assert.equal(await page.evaluate(()=>touchedNode.isConnected&&touchedNode===document.querySelector('[data-placement-id=TOUCH]')),true,'selection keeps the original touched SVG');
    await page.evaluate(()=>control.setProject(state));
    assert.equal(await page.evaluate(()=>touchedNode.isConnected),true,'app redraw while finger is down keeps the target alive');
    await send('touchEnd',[]);
    assert.equal(await page.evaluate(()=>events.activate.length),before.activate+1,'single completed native touch opens with touchTapOpens');

    center=await touchPoint();before=await page.evaluate(()=>({move:events.move.length,activate:events.activate.length}));
    await page.evaluate(()=>{window.touchedNode=document.querySelector('[data-placement-id=TOUCH]');});
    await send('touchStart',[{x:center.x,y:center.y,id:32}]);
    for(let step=1;step<=5;step++){
      await send('touchMove',[{x:center.x+step*6,y:center.y+step*2,id:32}]);
      assert.equal(await page.evaluate(()=>touchedNode.isConnected),true,'native drag frame keeps SVG connected');
    }
    await send('touchEnd',[]);
    assert.equal(await page.evaluate(()=>events.move.length),before.move+1,'native drag commits once');
    assert.equal(await page.evaluate(()=>events.activate.length),before.activate,'drag never opens');

    async function nativePinch(){
      const p=await touchPoint(),other={x:p.x+105,y:p.y+40};
      const counts=await page.evaluate(()=>({move:events.move.length,activate:events.activate.length,zoom:control.snapshot().zoom}));
      await page.evaluate(()=>{window.touchedNode=document.querySelector('[data-placement-id=TOUCH]');});
      await send('touchStart',[{x:p.x,y:p.y,id:41}]);
      await send('touchStart',[{x:p.x,y:p.y,id:41},{...other,id:42}]);
      for(let step=1;step<=4;step++)await send('touchMove',[{x:p.x-step*7,y:p.y-step*3,id:41},{x:other.x+step*7,y:other.y+step*3,id:42}]);
      assert.equal(await page.evaluate(()=>touchedNode.isConnected),true,'pinch keeps its original SVG target');
      await send('touchEnd',[{x:other.x+28,y:other.y+12,id:42}]);
      await send('touchMove',[{x:other.x+30,y:other.y+13,id:42}]);
      await send('touchEnd',[]);
      assert((await page.evaluate(()=>control.snapshot().zoom))>counts.zoom*1.2,'multi-frame native pinch zooms');
      assert.equal(await page.evaluate(()=>events.move.length),counts.move,'remaining pinch finger never commits a move');
      assert.equal(await page.evaluate(()=>events.activate.length),counts.activate,'pinch never opens');
      return page.evaluate(()=>performance.now());
    }
    const pinchEnded=await nativePinch();center=await touchPoint();before=await page.evaluate(()=>events.activate.length);
    assert((await page.evaluate(()=>performance.now()))-pinchEnded<350,'test acts before old post-pinch timeout');
    await send('touchStart',[{x:center.x,y:center.y,id:43}]);await send('touchEnd',[]);
    assert.equal(await page.evaluate(()=>events.activate.length),before+1,'fresh tap immediately after pinch opens');
    await nativePinch();center=await touchPoint();before=await page.evaluate(()=>({move:events.move.length,activate:events.activate.length}));
    await send('touchStart',[{x:center.x,y:center.y,id:44}]);
    for(let step=1;step<=4;step++)await send('touchMove',[{x:center.x+step*5,y:center.y,id:44}]);
    await send('touchEnd',[]);
    assert.equal(await page.evaluate(()=>events.move.length),before.move+1,'fresh drag immediately after pinch moves');
    assert.equal(await page.evaluate(()=>events.activate.length),before.activate);

    // Cancelled gestures and explicit pane changes never commit a preview.
    center=await touchPoint();before=await page.evaluate(()=>({move:events.move.length,activate:events.activate.length,placement:JSON.stringify(state.placements[0])}));
    await send('touchStart',[{x:center.x,y:center.y,id:45}]);await send('touchMove',[{x:center.x+18,y:center.y+5,id:45}]);await send('touchCancel',[]);
    assert.equal(await page.evaluate(()=>events.move.length),before.move);assert.equal(await page.evaluate(()=>JSON.stringify(state.placements[0])),before.placement);
    center=await touchPoint();await send('touchStart',[{x:center.x,y:center.y,id:46}]);await send('touchEnd',[]);
    assert.equal(await page.evaluate(()=>events.activate.length),before.activate+1,'tap recovers after touchcancel');
    center=await touchPoint();before=await page.evaluate(()=>events.move.length);
    await send('touchStart',[{x:center.x,y:center.y,id:47}]);await send('touchMove',[{x:center.x+18,y:center.y,id:47}]);await page.evaluate(()=>control.cancelInteraction());await send('touchEnd',[]);
    assert.equal(await page.evaluate(()=>events.move.length),before,'explicit pane cancel discards drag');
    center=await touchPoint();before=await page.evaluate(()=>events.move.length);
    await send('touchStart',[{x:center.x,y:center.y,id:49}]);await send('touchMove',[{x:center.x+18,y:center.y,id:49}]);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await send('touchEnd',[]);
    assert.equal(await page.evaluate(()=>events.move.length),before,'blur discards active touch preview');
    center=await touchPoint();before=await page.evaluate(()=>events.activate.length);
    await send('touchStart',[{x:center.x,y:center.y,id:50}]);await send('touchEnd',[]);
    assert.equal(await page.evaluate(()=>events.activate.length),before+1,'fresh touch works after blur cancellation');

    // Unexpected loss of a synthetic pointer capture clears its touch record,
    // so a subsequent independent touch cannot become a phantom pinch.
    center=await touchPoint();before=await page.evaluate(()=>({move:events.move.length,activate:events.activate.length}));
    await page.evaluate(p=>{const node=document.elementFromPoint(p.x,p.y),scroller=document.querySelector('.p2-canvas-scroller'),dispatch=(type,x,y,target=node)=>target.dispatchEvent(new PointerEvent(type,{pointerId:71,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true}));dispatch('pointerdown',p.x,p.y);dispatch('pointermove',p.x+20,p.y);dispatch('lostpointercapture',p.x+20,p.y,scroller);dispatch('pointerup',p.x+20,p.y,scroller);},center);
    assert.equal(await page.evaluate(()=>events.move.length),before.move,'lost capture discards an unfinished preview');
    center=await touchPoint();await send('touchStart',[{x:center.x,y:center.y,id:51}]);await send('touchEnd',[]);
    assert.equal(await page.evaluate(()=>events.activate.length),before.activate+1,'fresh native tap works after unexpected capture loss');

    // Resize previews patch attributes instead of replacing the touched handle.
    await page.evaluate(()=>{control.setSelection(['TOUCH']);control.zoomTo(1.5);});await idle(page);
    let touchHandle=await page.locator('[data-placement-id=TOUCH] [data-resize-handle=e]').boundingBox();
    await page.evaluate(()=>{window.touchedNode=document.querySelector('[data-placement-id=TOUCH]');window.touchedHandle=touchedNode.querySelector('[data-resize-handle=e]');});
    before=await page.evaluate(()=>events.resize.length);
    await send('touchStart',[{x:touchHandle.x+touchHandle.width/2,y:touchHandle.y+touchHandle.height/2,id:48}]);
    for(let step=1;step<=3;step++)await send('touchMove',[{x:touchHandle.x+touchHandle.width/2+step*5,y:touchHandle.y+touchHandle.height/2,id:48}]);
    assert.equal(await page.evaluate(()=>touchedNode.isConnected&&touchedHandle.isConnected),true,'resize target nodes stay connected');
    assert((await page.locator('[data-placement-id=TOUCH] > ellipse:not([class])').getAttribute('rx'))>32,'touch resize is visibly previewed');
    await send('touchEnd',[]);assert.equal(await page.evaluate(()=>events.resize.length),before+1);
    await native.detach();

    // Safari can emit lostpointercapture synchronously inside release. The
    // completed mouse gesture must survive and its final callback fire once.
    await page.evaluate(()=>{const s=document.querySelector('.p2-canvas-scroller'),release=s.releasePointerCapture.bind(s);s.releasePointerCapture=function(id){this.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:id,bubbles:true}));try{release(id);}catch(_){}};});
    center=await touchPoint();before=await page.evaluate(()=>events.move.length);
    await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+22,center.y+8,{steps:5});await page.mouse.up();
    assert.equal(await page.evaluate(()=>events.move.length),before+1,'synchronous lost capture cannot erase completed move');
    // Symbols stay movable/selectable but never activate a details editor.
    await page.evaluate(()=>{
      state.stencils.DA={...state.stencils.GS65,id:'DA',code:'DA',kind:'symbol',productType:'doorAutomation',shape:'square'};
      Object.assign(state.placements[0],{stencilId:'DA',code:'DA',equipment:{objectNumber:'OLD-DA-9',model:'SW300',quantity:3,note:'Saved metadata stays private'}});
      control.setSelection([]);control.setProject(state);control.fit();
    });await idle(page);
    center=await touchPoint();before=await page.evaluate(()=>({activate:events.activate.length,move:events.move.length}));
    const symbol=await page.locator('[data-placement-id=TOUCH]').evaluate(node=>({labels:[...node.querySelectorAll('text')].map(n=>n.textContent),aria:node.getAttribute('aria-label')}));
    assert.deepEqual(symbol.labels,['DA'],'symbol shows its code only');assert(!symbol.aria.includes('produktuppgifter')&&!symbol.aria.includes('dörrkort'),'symbol has no editor activation hint');
    await page.touchscreen.tap(center.x,center.y);await page.mouse.dblclick(center.x,center.y);
    await page.evaluate(()=>control.setSelection([]));const beforeKeyboardSelect=await page.evaluate(()=>events.select.length);
    await page.locator('[data-placement-id=TOUCH]').focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>events.select.length),beforeKeyboardSelect+1,'Enter reports symbol selection without activating');
    assert.equal(await page.evaluate(()=>events.activate.length),before.activate,'native tap, mouse double-click and Enter cannot activate a symbol');
    assert.deepEqual(await selected(page),['TOUCH'],'symbol can still be selected');
    await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+21,center.y+8,{steps:4});await page.mouse.up();
    assert.equal(await page.evaluate(()=>events.move.length),before.move+1,'symbol remains draggable');
    assert.equal(await page.evaluate(()=>state.placements[0].equipment.objectNumber),'OLD-DA-9','legacy equipment metadata is preserved');
    assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.errors),[]);

    // Fractional desktop panel widths must settle without a scrollbar/refit loop.
    await page.evaluate(async()=>{await control.page(1);document.getElementById('host').style.width='590.5px';document.getElementById('host').style.height='500.6px';control.fit();});
    await idle(page);
    const fitted=await page.evaluate(async()=>{const values=[];for(let i=0;i<45;i++){await new Promise(r=>requestAnimationFrame(r));const s=control.snapshot(),p=document.querySelector('.p2-canvas-page').getBoundingClientRect(),h=document.querySelector('.p2-canvas-scroller');values.push({z:s.zoom,x:p.x,y:p.y,cw:h.clientWidth,ch:h.clientHeight,sw:h.scrollWidth,sh:h.scrollHeight});}return values;});
    assert(Math.max(...fitted.map(s=>s.z))-Math.min(...fitted.map(s=>s.z))<1e-8,'fitted zoom settles without oscillation');
    assert(Math.max(...fitted.map(s=>s.x))-Math.min(...fitted.map(s=>s.x))<.05,'fitted page does not vibrate horizontally');
    assert(Math.max(...fitted.map(s=>s.y))-Math.min(...fitted.map(s=>s.y))<.05,'fitted page does not vibrate vertically');
    assert.equal(await page.locator('.p2-canvas-scroller').getAttribute('data-fit'),'true');
    assert.equal(await page.locator('.p2-canvas-scroller').evaluate(n=>getComputedStyle(n).overflow),'hidden');
    for(const [width,height] of [[620.25,420.75],[510.75,650.5],[590.5,500.6]]){await page.evaluate(([w,h])=>{document.getElementById('host').style.width=w+'px';document.getElementById('host').style.height=h+'px';},[width,height]);await idle(page);const geometry=await page.evaluate(()=>{const a=document.querySelector('.p2-canvas-page').getBoundingClientRect(),b=document.querySelector('.p2-canvas-scroller').getBoundingClientRect();return{left:a.left-b.left,right:b.right-a.right,top:a.top-b.top,bottom:b.bottom-a.bottom};});assert(Object.values(geometry).every(v=>v>20),'fit stays inside all resized panel edges: '+JSON.stringify(geometry));}

    await page.evaluate(()=>control.setTextSelection(true));
    await page.waitForFunction(()=>document.querySelectorAll('.p2-text-layer span').length>0&&getComputedStyle(document.querySelector('.p2-text-layer')).visibility!=='hidden');
    const textGeometry=await page.locator('.p2-text-layer span').first().evaluate(n=>{const a=n.getBoundingClientRect(),b=document.querySelector('.p2-canvas-page').getBoundingClientRect();return{text:n.textContent,x:(a.left-b.left)/b.width,y:(a.top-b.top)/b.height,w:a.width,h:a.height};});
    assert(textGeometry.text.includes('Sida 1'));assert(Math.abs(textGeometry.x-35/600)<.01);assert(textGeometry.y>=0&&textGeometry.y<.15);assert(textGeometry.w>20&&textGeometry.h>5);
    const span=await page.locator('.p2-text-layer span').first().boundingBox(),movesBeforeText=await page.evaluate(()=>events.move.length);
    await page.mouse.move(span.x+1,span.y+span.height/2);await page.mouse.down();await page.mouse.move(span.x+span.width-1,span.y+span.height/2,{steps:12});await page.mouse.up();
    const copiedText=await page.evaluate(()=>control.getSelectedText());assert(copiedText.includes('Sida 1'),'native mouse drag selects embedded PDF text');assert.equal(await page.evaluate(()=>events.move.length),movesBeforeText,'text selection never drags a stamp');
    assert.equal(await page.evaluate(()=>control.snapshot().textSelection),true);
    await page.evaluate(()=>control.setTextSelection(false));assert.equal(await page.evaluate(()=>control.getSelectedText()),'');
    assert.equal(await page.evaluate(()=>control.snapshot().textSelection),false);
    await page.evaluate(()=>control.showSearchMatch({page:2,rects:[{x:.15,y:.3,width:.12,height:.04}]}));await idle(page);
    assert.equal(await page.evaluate(()=>control.snapshot().page),2);assert.equal(await page.locator('.p2-search-highlight').count(),1);
    const highlight=await page.locator('.p2-search-highlight').evaluate(n=>{const a=n.getBoundingClientRect(),b=document.querySelector('.p2-canvas-page').getBoundingClientRect();return{x:(a.left-b.left)/b.width,y:(a.top-b.top)/b.height,w:a.width/b.width,h:a.height/b.height};});
    assert(Math.abs(highlight.x-.15)<.002&&Math.abs(highlight.y-.3)<.002&&Math.abs(highlight.w-.12)<.002&&Math.abs(highlight.h-.04)<.002);
    await page.evaluate(()=>control.clearSearchMatch());assert.equal(await page.locator('.p2-search-highlight').count(),0);
    // The second navigation wins even if the first page resolves last.
    await page.evaluate(()=>control.page(1));await idle(page);
    const navigationRace=await page.evaluate(async()=>{
      const pdf=control.getSearchDocument(),real=pdf.getPage,source=real.bind(pdf);let release,held=false;
      pdf.getPage=function(number){if(number===2&&!held){held=true;return new Promise(resolve=>{release=()=>source(number).then(resolve);});}return source(number);};
      try{
        const first=control.showSearchMatch({page:2,rects:[{x:.1,y:.2,width:.1,height:.03}]}).then(()=>null,error=>error.name);
        while(!release)await new Promise(resolve=>setTimeout(resolve,0));
        await control.showSearchMatch({page:1,rects:[{x:.3,y:.4,width:.12,height:.03}]});release();
        return{first:await first,snapshot:control.snapshot()};
      }finally{pdf.getPage=real;}
    });
    assert.equal(navigationRace.first,'AbortError');assert.equal(navigationRace.snapshot.page,1);assert.equal(navigationRace.snapshot.searchMatch.page,1);assert.equal(navigationRace.snapshot.searchMatch.rects[0].x,.3,'late first navigation cannot replace the current highlight');

    assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.errors),[]);
    console.log('PASS projection 2.10 canvas: prior geometry/native-touch regression, stable fractional-size fit, native PDF text selection, rotated-page search navigation/highlights and original bytes preserved.');

    }
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
