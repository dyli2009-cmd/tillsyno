'use strict';
// Standalone product combobox tests. No screenshots or images are created.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=require(runtime?path.join(runtime,'playwright'):'playwright');
const script=fs.readFileSync(path.join(__dirname,'../smartmatch-projektering-v2-8-suggest.js'),'utf8');
async function fixture(page){
 await page.setContent(`<!doctype html><html lang="sv"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:12px;font:16px Arial}#host{height:280px;overflow:auto;border:1px solid #ccc;padding:8px;width:calc(100% - 20px);max-width:450px}.row{display:flex;gap:6px;margin:8px 0}input{box-sizing:border-box;min-width:0;width:170px;height:36px;font-size:16px}.row input[type=number]{width:60px}body[data-view=other] #host{display:none}#outside{position:fixed;top:12px;right:12px}</style></head><body data-view="cards"><div id="host"><div class="row"><input id="operator" data-product-input data-row-id="operator" maxlength="160" aria-label="Dörrautomatik produkt"><input id="quantity" type="number" value="3" aria-label="Antal"></div><div class="row"><input id="lock" data-product-input data-row-id="lock" maxlength="160" aria-label="Låshus produkt"></div><div style="height:500px"></div></div><button id="outside">Utanför</button></body></html>`);
 await page.addScriptTag({content:script});
 await page.evaluate(()=>{
  window.mockProducts=[{id:'sw300',name:'SW300',description:'Dörrautomatik'},{id:'sw100',name:'SW100',description:'Dörrautomatik'},...Array.from({length:64},(_,i)=>({id:'s-'+i,name:'S'+String(i).padStart(3,'0'),description:'Exempel '+i}))];
  window.rows={operator:{product:'',quantity:3,delivery:'GS',installer:'DT'},lock:{product:'',quantity:2,delivery:'EL',installer:'BH'}};window.inputCalls=[];window.pickCalls=[];window.suggestionsEnabled=true;
  const fold=value=>String(value).toLowerCase().replace(/[\s-]/g,'');
  window.suggest=Proj2Suggest.create({host:document.getElementById('host'),enabled:()=>suggestionsEnabled,
   search:(rowId,query)=>(rowId==='lock'?[{id:'lock511',name:'511-50',description:'Låshus'},{id:'lock140',name:'ST140-50',description:'Låshus'}]:mockProducts).filter(product=>fold(product.name).startsWith(fold(query))),
   onInput:(rowId,value)=>{inputCalls.push({rowId,value});rows[rowId].product=value;},
   onPick:(rowId,product)=>{pickCalls.push({rowId,id:product.id,name:product.name});rows[rowId].product=product.name;}
  });
 });
}
async function opened(page){await page.waitForSelector('.p2-suggest:not([hidden])');}
async function closed(page){await page.waitForSelector('.p2-suggest[hidden]',{state:'attached'});}
async function nativeSwipe(page){
 const session=await page.context().newCDPSession(page),box=await page.locator('.p2-suggest-list').boundingBox();
 const x=box.x+Math.min(70,box.width/2),start=box.y+box.height-25,end=box.y+30;
 try{
  await page.evaluate(()=>{window.suggestPointerCancels=0;document.querySelector('.p2-suggest').addEventListener('pointercancel',()=>suggestPointerCancels++,{once:true});});
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start,id:7,radiusX:4,radiusY:4,force:1}]});
  await page.evaluate(()=>{document.getElementById('operator').blur();visualViewport?.dispatchEvent(new Event('resize'));});await opened(page);
  for(let frame=1;frame<=9;frame++){
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*frame/9,id:7,radiusX:4,radiusY:4,force:1}]});
   if(frame===4){await page.evaluate(()=>visualViewport?.dispatchEvent(new Event('resize')));await opened(page);}
   await page.waitForTimeout(18);
  }
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>document.querySelector('.p2-suggest-list').scrollTop>5);
  assert.equal(await page.evaluate(()=>suggestPointerCancels),1,'native list scrolling cancels the pointer stream without ending the touch stream');
 }finally{await session.detach();}
}
async function nativeTapVisibleOption(page,cancel=false){
 await page.waitForFunction(()=>{const top=document.querySelector('.p2-suggest-list').scrollTop,previous=window.suggestScrollCheck;window.suggestScrollCheck={top,stable:previous?.top===top?previous.stable+1:0};return suggestScrollCheck.stable>=6;});
 const session=await page.context().newCDPSession(page),box=await page.locator('.p2-suggest-list').boundingBox(),point={x:box.x+40,y:box.y+30};
 const expected=await page.evaluate(({x,y})=>document.elementFromPoint(x,y).closest('[role=option]').querySelector('.p2-suggest-name').textContent,point);
 try{await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:8,radiusX:4,radiusY:4,force:1}]});await session.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});}finally{await session.detach();}
 return expected;
}
async function run(browser,device){
 const context=await browser.newContext({viewport:device.viewport,hasTouch:device.touch,isMobile:device.touch}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(5000);
 try{
  await fixture(page);const operator=page.locator('#operator'),lock=page.locator('#lock');
  await operator.fill('S');await opened(page);assert.equal(await page.locator('.p2-suggest-option').count(),50);assert.match(await page.locator('.p2-suggest-note').textContent(),/50 av 66/);
  assert.equal(await operator.getAttribute('role'),'combobox');assert.equal(await operator.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#'+await operator.getAttribute('aria-controls')).getAttribute('role'),'listbox');
  assert.equal(await page.locator('.p2-suggest').evaluate(node=>{const box=node.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight;}),true,'portal fits the current viewport');
  assert(await page.locator('.p2-suggest-list').evaluate(node=>node.scrollHeight>node.clientHeight),'many choices scroll within their own list');
  await page.locator('.p2-suggest-list').evaluate(node=>{node.scrollTop=200;node.dispatchEvent(new Event('scroll'));});await opened(page);
  await operator.press('ArrowUp');assert.equal(await page.locator('.p2-suggest-option[aria-selected="true"]').count(),1);assert(await operator.getAttribute('aria-activedescendant'));await opened(page);
  if(device.touch){
   await operator.fill('S');await opened(page);const before=await page.evaluate(()=>pickCalls.length);
   await nativeSwipe(page);await opened(page);assert.equal(await page.evaluate(()=>pickCalls.length),before,'a real touch swipe scrolls without picking');
   assert.equal(await operator.inputValue(),'S');assert.equal(await page.evaluate(()=>rows.operator.product),'S','scrolling preserves typed free text');
   await nativeTapVisibleOption(page,true);await opened(page);assert.equal(await page.evaluate(()=>pickCalls.length),before,'a canceled native touch never chooses an option');
   const expected=await nativeTapVisibleOption(page);await closed(page);assert.equal(await page.evaluate(()=>pickCalls.length),before+1,'a following real touch tap picks once');assert.equal(await operator.inputValue(),expected);assert.equal(await operator.evaluate(node=>document.activeElement===node),true,'completed tap restores typing focus after scroll-related blur');
   assert.deepEqual(await page.evaluate(()=>({quantity:rows.operator.quantity,delivery:rows.operator.delivery,installer:rows.operator.installer})),{quantity:3,delivery:'GS',installer:'DT'});
   await page.evaluate(()=>{pickCalls=[];});await operator.fill('S');await opened(page);
  }
  await operator.press('Escape');await closed(page);assert.equal(await operator.inputValue(),'S');assert.equal(await operator.getAttribute('aria-activedescendant'),null);assert.equal(await page.evaluate(()=>pickCalls.length),0);
  await operator.fill('S');await opened(page);await operator.evaluate(node=>{node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));node.value='SW';node.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));});
  assert.equal(await page.locator('.p2-suggest-option').count(),50,'composition does not replace suggestions mid-entry');
  assert.equal(await operator.evaluate(node=>{const event=new KeyboardEvent('keydown',{key:'ArrowDown',isComposing:true,bubbles:true,cancelable:true});node.dispatchEvent(event);return event.defaultPrevented;}),false,'IME arrow keys are not intercepted');
  await operator.evaluate(node=>node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));await opened(page);assert.deepEqual(await page.locator('.p2-suggest-name').allTextContents(),['SW300','SW100']);
  await page.evaluate(()=>mockProducts.push({id:'literal',name:'S<svg onload=bad()>',description:'<img src=x onerror=bad()>'}));await operator.fill('S<');await opened(page);assert.equal(await page.locator('.p2-suggest-option svg,.p2-suggest-option img').count(),0);assert.match(await page.locator('.p2-suggest-option').textContent(),/S<svg/);await operator.press('Escape');
  await operator.fill('SW');await opened(page);assert.deepEqual(await page.locator('.p2-suggest-name').allTextContents(),['SW300','SW100']);
  await operator.press('ArrowDown');await operator.press('Enter');await closed(page);assert.equal(await operator.inputValue(),'SW300');
  assert.deepEqual(await page.evaluate(()=>rows.operator),{product:'SW300',quantity:3,delivery:'GS',installer:'DT'});assert.equal(await page.evaluate(()=>pickCalls.length),1);
  await operator.fill('MY OWN MODEL');await closed(page);assert.equal(await page.evaluate(()=>rows.operator.product),'MY OWN MODEL');
  await operator.press('Enter');assert.equal(await page.evaluate(()=>pickCalls.length),1,'free text Enter does not invent a selection');
  await operator.fill('SW300');await opened(page);await operator.evaluate(node=>node.setSelectionRange(1,1));await page.keyboard.insertText('X');
  assert.equal(await operator.inputValue(),'SXW300');assert.equal(await operator.evaluate(node=>node.selectionStart),2);assert.equal(await operator.evaluate(node=>document.activeElement===node),true,'typing retains field focus and caret');await closed(page);
  await operator.fill('S');await opened(page);await operator.press('ArrowDown');await operator.press('Tab');await closed(page);assert.equal(await page.evaluate(()=>rows.operator.product),'S');assert.equal(await page.evaluate(()=>pickCalls.length),1,'Tab never chooses a highlighted alternative implicitly');
  await lock.fill('51');await opened(page);assert.deepEqual(await page.locator('.p2-suggest-name').allTextContents(),['511-50']);
  await lock.press('ArrowDown');await lock.press('Enter');await closed(page);assert.deepEqual(await page.evaluate(()=>rows.lock),{product:'511-50',quantity:2,delivery:'EL',installer:'BH'});
  await operator.fill('sw 3');await opened(page);assert.deepEqual(await page.locator('.p2-suggest-name').allTextContents(),['SW300']);
  await page.evaluate(()=>{window.pickedOption=document.querySelector('.p2-suggest-option');});
  if(device.touch)await page.locator('.p2-suggest-option').tap();else await page.locator('.p2-suggest-option').click();
  await closed(page);assert.equal(await operator.inputValue(),'SW300');assert.equal(await page.evaluate(()=>pickCalls.length),3,'pointer selects exactly once');assert.equal(await operator.evaluate(node=>document.activeElement===node),true,'pointer selection does not blur the input');
  assert.equal(await page.evaluate(()=>pickedOption.isConnected),true,'the touched option remains connected through its compatibility click');
  await operator.fill('SW');await opened(page);await page.locator('.p2-suggest-option').first().dispatchEvent('click',{detail:0});await closed(page);assert.equal(await page.evaluate(()=>pickCalls.length),4,'assistive click remains available after touch use');
  await operator.fill('S');await opened(page);await page.evaluate(()=>document.getElementById('host').dispatchEvent(new Event('scroll')));await closed(page);
  await operator.fill('SW');await opened(page);await page.setViewportSize({width:device.viewport.width-1,height:device.viewport.height});await closed(page);
  await operator.fill('S');await opened(page);await page.evaluate(()=>{document.getElementById('operator').disabled=true;});await closed(page);
  const calls=await page.evaluate(()=>inputCalls.length);await page.evaluate(()=>{const input=document.getElementById('operator');input.value='disabled';input.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.evaluate(()=>inputCalls.length),calls);
  await page.evaluate(()=>{document.getElementById('operator').disabled=false;suggestionsEnabled=false;});await operator.fill('SW');await closed(page);assert.equal(await page.evaluate(()=>inputCalls.length),calls,'disabled feature does not change draft text');
  await page.evaluate(()=>{suggestionsEnabled=true;});await operator.fill('S');await opened(page);await page.locator('#outside').click();await closed(page);
  await operator.fill('SW');await opened(page);await page.evaluate(()=>{document.body.dataset.view='other';});await closed(page);await page.evaluate(()=>{document.body.dataset.view='cards';});
  await operator.fill('S');await opened(page);await page.evaluate(()=>{const previous=document.getElementById('operator'),replacement=previous.cloneNode(true);for(const name of ['role','aria-autocomplete','aria-controls','aria-expanded','aria-activedescendant','autocomplete'])replacement.removeAttribute(name);previous.replaceWith(replacement);});await closed(page);
  await operator.fill('SW');await opened(page);await operator.evaluate(node=>{node.readOnly=true;});await closed(page);await operator.evaluate(node=>{node.readOnly=false;});
  await operator.fill('SW');await opened(page);await page.evaluate(()=>{suggest.destroy();suggest.destroy();});assert.equal(await page.locator('.p2-suggest,.p2-suggest-live').count(),0);assert.equal(await operator.getAttribute('role'),null);assert.equal(await operator.getAttribute('aria-controls'),null);
  const afterDestroy=await page.evaluate(()=>inputCalls.length);await operator.fill('after destroy');assert.equal(await page.evaluate(()=>inputCalls.length),afterDestroy);assert.deepEqual(errors,[]);
  console.log(device.name+': free text, keyboard, touch/click, caret, scrolling, cancellation, lifecycle and metadata passed');
 }finally{await context.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const device of [{name:'Desktop',viewport:{width:1280,height:800},touch:false},{name:'iPhone',viewport:{width:390,height:844},touch:true},{name:'iPad',viewport:{width:834,height:1112},touch:true}])await run(browser,device);}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
