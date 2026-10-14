const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),nodes={};
class Element{
 constructor(tag='div'){this.tag=tag;this.style={};this.dataset={};this.children=[];this.events={};this.scrollTop=0;this.scrollLeft=0;this.clientWidth=320;this.clientHeight=400;this.classList={add(){},remove(){},toggle(){}};}
 append(...items){for(const item of items){this.children.push(item);item.parentElement=this;}}
 insertBefore(node){this.append(node);}
 setAttribute(){}
 remove(){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);}
 addEventListener(type,fn,options){this.events[type]={fn,options};}
 getBoundingClientRect(){const width=parseFloat(this.style.width)||320,height=parseFloat(this.style.height)||400;return {left:0,top:0,width,height,right:width,bottom:height};}
 querySelectorAll(selector){return this.children.filter(node=>selector==='canvas,img'?['canvas','img'].includes(node.tag):'.'+node.className===selector);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const document={getElementById:id=>nodes[id]||null,createElement:tag=>new Element(tag)};
const window={};
const source=fs.readFileSync(path.join(root,'project-ce-markning-test-v6-module.js'),'utf8').replace('window.TillsynoCETest={','window.CEZoomVerify={place:slrPlacePdfInput,pinch:slrEnablePinch,pan:slrEnableNavigation,preview:slrBindPreviewZoom,zoom:()=>slrPageZoom};window.TillsynoCETest={');
vm.runInNewContext(source,{document,window,console,Uint8Array,Set,Map,Math});
const api=window.CEZoomVerify;
// Focus-safe font retains exact displayed PDF geometry at small and large zoom.
for(const font of [4.5,5,7,10,16,24]){
 const field=new Element('input');api.place(field,12,20,110,13,font,false,1);
 const text=field.style.cssText,number=key=>parseFloat(text.match(new RegExp('(?:^|;)'+key+':([\\d.]+)'))[1]);
 const scale=parseFloat(text.match(/transform:scale\(([\d.]+)/)[1]);
 assert(number('font-size')>=16);assert(Math.abs(number('font-size')*scale-font)<0.001);
 assert(Math.abs(number('width')*scale-110)<0.001);assert(Math.abs(number('height')*scale-13)<0.001);assert.equal(number('left'),12);
}
// PDF pinch cancels native browser zoom at gesture start, and changes only the page.
const page=new Element();api.pinch(page,'Riskanalys');
let prevented=0;const event=(gap)=>({touches:[{clientX:20,clientY:30},{clientX:20+gap,clientY:30}],cancelable:true,preventDefault(){prevented++;}});
page.events.touchstart.fn(event(100));assert.equal(page.events.touchstart.options.passive,false);
page.events.touchmove.fn(event(200));assert.equal(page.style.transform,'scale(2)');assert.equal(prevented,2);assert.equal(api.zoom(),1);
page.events.touchcancel.fn({touches:[]});assert.equal(page.style.transform,'');assert.equal(api.zoom(),1);
// Mouse dragging scrolls the PDF workspace; form controls keep their normal interaction.
const workspace=new Element();api.pan(workspace,'Riskanalys');
const blank={closest:selector=>selector==='.slrOriginalPage'?page:null};
workspace.events.pointerdown.fn({pointerType:'mouse',button:0,pointerId:1,clientX:100,clientY:100,target:blank,preventDefault(){}});
workspace.events.pointermove.fn({pointerId:1,clientX:80,clientY:70,preventDefault(){}});assert.equal(workspace.scrollLeft,20);assert.equal(workspace.scrollTop,30);
workspace.events.pointerup.fn({pointerId:1});
workspace.events.pointerdown.fn({pointerType:'mouse',button:0,pointerId:2,clientX:0,clientY:0,target:{closest:()=>page},preventDefault(){throw Error('Field input must not be captured');}});
// Preview has independent zoom, canvas size changes while header and form zoom stay fixed.
const dialog=new Element(),header=new Element();header.className='header';dialog.querySelector=selector=>selector==='header'?header:dialog.children.find(n=>'.'+n.className===selector)||header.children.find(n=>'.'+n.className===selector)||null;
const preview=new Element();dialog.append(header,preview);nodes.slrPreviewClose=new Element('button');header.append(nodes.slrPreviewClose);
const sheet=new Element();sheet.className='slrPreviewPage';sheet.dataset={ceWidth:'300',ceHeight:'420'};const canvas=new Element('canvas');sheet.append(canvas);preview.append(sheet);
api.preview(preview);preview.ceApplyZoom(2);assert.equal(sheet.style.width,'600px');assert.equal(canvas.style.height,'840px');assert.equal(header.style.transform,undefined);assert.equal(api.zoom(),1);
preview.ceApplyZoom(20);assert.equal(preview.dataset.ceZoom,'3.5');preview.ceApplyZoom(.1);assert.equal(preview.dataset.ceZoom,'1');
api.preview(preview);assert.equal(header.children.filter(n=>n.className==='cePreviewZoom').length,1,'reopening does not accumulate controls');
// App guard leaves typing and one-finger scrolling untouched, cancels native pinch/gesture zoom.
const host=fs.readFileSync(path.join(root,'project-ce-markning-test-v6.js'),'utf8');const guard=host.slice(host.indexOf('function ceKeepAppZoom'),host.indexOf('for(const type'));
const guardContext={};vm.runInNewContext(guard,guardContext);
let cancelled=0;const guarded=touches=>({type:'touchstart',touches,cancelable:true,preventDefault(){cancelled++;}});
guardContext.ceKeepAppZoom(guarded([{}]));assert.equal(cancelled,0);guardContext.ceKeepAppZoom(guarded([{},{}]));assert.equal(cancelled,1);
guardContext.ceKeepAppZoom({type:'gesturestart',cancelable:true,preventDefault(){cancelled++;}});assert.equal(cancelled,2);
const html=fs.readFileSync(path.join(root,'project-ce-markning-test-v6.html'),'utf8');assert(html.includes('maximum-scale=1'));
assert.equal(html,fs.readFileSync(path.join(root,'project-ce-markning-test.html'),'utf8'));
console.log('PASS: PDF-only pinch/pan and preview zoom; stable header; focus-safe input font with exact PDF geometry; native pinch guard preserves single-touch input; TEST 6 stable page. iPhone Safari itself requires device verification.');
