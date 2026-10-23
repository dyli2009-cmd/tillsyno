'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const D=require('../smartmatch-projektering-v2-15-data.js'),A=D.Annotations;
const PDF=require('../smartmatch-projektering-v2-15-pdf.js'),Store=require('../smartmatch-projektering-v2-18-store.js');
const {PDFDocument,degrees}=require('../vendor/pdf-lib.min.js');
const pdfjs=require('../vendor/pdf.min.js');pdfjs.GlobalWorkerOptions.workerSrc=path.resolve(__dirname,'../vendor/pdf.worker.min.js');
const native=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const {harness,Element}=require('./smartmatch-projektering-v2-14-sharpness.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
Element.prototype.closest=function(selector){
 const attributes={'[data-annotation-id]':'annotationId','[data-annotation-arrow]':'annotationArrow','[data-annotation-resize]':'annotationResize','[data-placement-id]':'placementId'};
 if(attributes[selector]&&this.dataset[attributes[selector]])return this;
 if(selector.split(',').includes(this.tagName))return this;
 return this.parent?.closest(selector)||null;
};
function event(type,target,values={}){const e=new Event(type,{cancelable:true});Object.defineProperty(e,'target',{value:target});for(const [key,value]of Object.entries(values))Object.defineProperty(e,key,{value});return e;}
(async()=>{
 const document=await PDFDocument.create();document.addPage([600,800]);const rotated=document.addPage([800,600]);rotated.setCropBox(50,70,650,450);rotated.setRotation(degrees(90));
 const original=new Uint8Array(await document.save()),state=D.createEmpty('Text och pilar');state.drawing={name:'original.pdf',pages:PDF.metadata(document)};
 const first=A.create(1,.5,.3,state.drawing.pages);first.text='Automatik till dörr\nKontrollera öppning';first.fill='#202a25';first.textColor='#ffffff';first.borderColor='#d4443d';first.borderWidth=2;
 first.arrows=[{id:'arrow-1',x:.2,y:.65},{id:'arrow-2',x:.8,y:.6}];
 state.annotations=[A.normalize(first,state.drawing.pages),A.update(A.create(2,.5,.5,state.drawing.pages),{text:'Roterad sida – åäö',fill:null,borderColor:'#d4443d'},state.drawing.pages)];
 const valid=D.validate(state);assert.deepEqual(valid.annotations,state.annotations);assert.equal(valid.schema,3);assert.throws(()=>require('../smartmatch-projektering-v2-13-data.js').validate(valid),/version/);
 const legacy=clone(state);delete legacy.annotations;assert.deepEqual(D.validate(legacy).annotations,[]);
 assert.equal(Object.keys(valid.cards).length,0,'notes do not create door cards');
 assert.equal(valid.placements.length,0,'notes do not count as door placements');
 assert.throws(()=>A.update(first,{arrows:[first.arrows[0],first.arrows[0]]},state.drawing.pages),/dubblerade/);
 assert.throws(()=>A.update(first,{text:'x'.repeat(2001)},state.drawing.pages),/2 000/);
 assert.throws(()=>A.update(first,{fill:'url(evil)'},state.drawing.pages),/färg/);
 const edge=A.update(first,{x:0,y:0},state.drawing.pages),b=A.box(edge,state.drawing.pages[0]);assert(b.x>=0&&b.y>=0,'text stays inside the page');
 const moved=A.update(first,{x:.6},state.drawing.pages);assert.deepEqual(moved.arrows,first.arrows,'moving the box keeps arrow targets on their doors');
 assert.notDeepEqual(A.arrow(first,first.arrows[0],state.drawing.pages[0]).start,A.arrow(moved,moved.arrows[0],state.drawing.pages[0]).start,'arrow follows the box edge');
 const markup=A.svg(A.update(first,{text:'<script>alert(1)</script>'},state.drawing.pages),state.drawing.pages[0],true,2);assert(markup.includes('&lt;script&gt;'));assert(!markup.includes('<script>'));
 const file=await Store.pack(valid,original),restored=await Store.unpack(file);assert.deepEqual(restored.state,clone(valid));assert.deepEqual(restored.original,original);
 const bytes=await PDF.build(valid,original,{mode:'drawing'}),reopened=await PDF.inspect(bytes);assert.deepEqual(reopened.state,clone(valid));assert.deepEqual(reopened.original,original);
 const parsed=await pdfjs.getDocument({data:bytes.slice(),disableFontFace:true,useSystemFonts:false,standardFontDataUrl:path.dirname(require.resolve('pdfjs-dist/package.json'))+'/standard_fonts/'}).promise;
 const page1=await parsed.getPage(1),page2=await parsed.getPage(2);
 const text1=(await page1.getTextContent()).items.map(item=>item.str).join(' '),text2=(await page2.getTextContent()).items.map(item=>item.str).join(' ');
 assert(text1.includes('Automatik till dörr'));assert(text1.includes('Kontrollera öppning'));assert(text2.includes('Roterad sida'));
 const viewport=page1.getViewport({scale:1.5}),surface=native.createCanvas(viewport.width,viewport.height);
 await page1.render({canvasContext:surface.getContext('2d'),viewport}).promise;fs.writeFileSync('/tmp/annotation-qa.png',surface.toBuffer('image/png'));await parsed.destroy();

 // Real production gesture handlers through pointer and native iOS-style touch events.
 for(const nativeTouch of [false,true]){
  const changes=[],selections=[],creations=[],arrows=[];
  const project=clone(valid);
  const h=harness(2,820,620,{nativeTouch,onAnnotationSelect:id=>selections.push(id),onAnnotationChange:change=>{changes.push(change);project.annotations=project.annotations.map(a=>a.id===change.id?change.item:a);h.viewer.setProject(project);},onAnnotationCreate:value=>creations.push(value),onAnnotationArrow:value=>arrows.push(value)});
  try{
   await h.viewer.open(original);h.viewer.setProject(project);
   const scroller=h.get('p2-canvas-scroller'),overlay=h.get('p2-canvas-overlay'),target=new Element('g');target.dataset.annotationId=first.id;overlay.append(target);
   const tip=new Element('g');tip.dataset.annotationId=first.id;tip.dataset.annotationArrow='arrow-1';target.append(tip);
   const corner=new Element('g');corner.dataset.annotationId=first.id;corner.dataset.annotationResize='se';target.append(corner);
   const blank=new Element('svg');overlay.append(blank);let hit=target;h.document.elementFromPoint=()=>hit;
   const screen=(x,y)=>{const r=h.get('p2-canvas-page').getBoundingClientRect();return{clientX:r.left+x*r.width,clientY:r.top+y*r.height};};
   const send=(phase,node,x,y)=>{hit=node;const point=screen(x,y);if(nativeTouch)h.window.dispatchEvent(event({down:'touchstart',move:'touchmove',up:'touchend',cancel:'touchcancel'}[phase],node,{changedTouches:[{identifier:1,...point}],touches:phase==='up'?[]:[{identifier:1,...point}]}));else scroller.dispatchEvent(event('pointer'+phase,node,{pointerType:'touch',pointerId:1,button:0,shiftKey:false,...point}));};
   send('down',target,.5,.3);send('up',target,.5,.3);assert.equal(h.viewer.snapshot().annotationId,first.id);
   send('down',target,.5,.3);send('move',target,.6,.4);send('up',target,.6,.4);assert.equal(changes.length,1);assert(Math.abs(changes[0].item.x-.6)<1e-6);assert.deepEqual(changes[0].item.arrows,first.arrows);
   send('down',tip,.2,.65);send('move',tip,.25,.72);send('up',tip,.25,.72);assert(Math.abs(changes.at(-1).item.arrows[0].x-.25)<1e-6);
   const before=project.annotations[0],box=A.box(before,project.drawing.pages[0]);send('down',corner,(box.x+box.width)/600,(box.y+box.height)/800);send('move',corner,.9,.55);send('up',corner,.9,.55);assert(changes.at(-1).item.width>before.width,'corner increases width');
   const count=changes.length;send('down',target,.6,.4);send('move',target,.65,.45);send('cancel',target,.65,.45);assert.equal(changes.length,count,'cancel never persists preview');assert.equal(h.viewer.snapshot().annotationPreview,null);
   send('down',blank,.1,.1);send('up',blank,.1,.1);assert.equal(h.viewer.snapshot().annotationId,null,'outside tap deselects');assert(selections.includes(null));
   h.viewer.setTool('text');send('down',blank,.4,.5);send('up',blank,.4,.5);assert.equal(creations.length,1);
   h.viewer.setAnnotationSelection(first.id);h.viewer.setTool('arrow');send('down',blank,.8,.8);send('up',blank,.8,.8);assert.equal(arrows.length,1);assert.equal(arrows[0].id,first.id);
   await h.viewer.page(2);assert.equal(h.viewer.snapshot().annotationId,null,'page change clears selection');assert.deepEqual(h.errors,[]);
  }finally{h.viewer.destroy();}
 }
 console.log('PASS: annotation validation, layout, multiple arrows, style, saved project/PDF round trip, searchable text, rotated source, pointer/native touch drag/resize/arrow, cancellation, outside deselection and placement tools.');
})().catch(error=>{console.error(error);process.exitCode=1;});
