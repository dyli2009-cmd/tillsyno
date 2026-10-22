'use strict';
// Reuse the generated integration scenario against the new immutable entry.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.join(__dirname,'smartmatch-projektering-v2-browser.cjs');
let source=fs.readFileSync(file,'utf8');
if(!source.includes('smartmatch-projektering-v2.html'))throw Error('Missing shared integration entry');
const anchor="await page.goto(url());await ready(page);await overflow(page);trace('boot');";
if(!source.includes(anchor))throw Error('Missing compatibility test insertion point');
source=source.replace(anchor,anchor+`
  assert.equal(await page.evaluate(()=>Proj2App.version),'2.1');
  await page.evaluate(()=>{Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined,configurable:true});Object.defineProperty(Element.prototype,'webkitRequestFullscreen',{value:undefined,configurable:true});});
  await page.locator('#fullscreen').click();
  assert((await page.locator('#appMessage').innerText()).includes('Helskärm stöds inte'));
  assert.deepEqual(errors,[],'unsupported fullscreen remains a usable editor');
  await page.evaluate(()=>{window.__webkitCalls=0;Object.defineProperty(Element.prototype,'webkitRequestFullscreen',{configurable:true,value:function(){window.__webkitCalls++;}});});
  await page.locator('#fullscreen').click();
  assert.equal(await page.evaluate(()=>window.__webkitCalls),1,'WebKit entry method is supported');
  assert.deepEqual(errors,[]);
`);
const child=new Module(file,module);child.filename=file;child.paths=module.paths;
child._compile(source.replaceAll('smartmatch-projektering-v2.html','smartmatch-projektering-v2-1.html'),file);
