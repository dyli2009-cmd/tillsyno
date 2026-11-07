'use strict';
// Run with NODE_PATH pointing at the existing runtime dependencies; no browser or network is required.
const assert = require('node:assert/strict');
const Style = require('../controlflow-stamp-style-v549.js');
const PDFLib = require('pdf-lib');
let checks=0;
function equal(actual,expected,message){assert.deepEqual(actual,expected,message);checks++;}
function near(actual,expected,message){assert.ok(Math.abs(actual-expected)<1e-7,message+': '+actual+' vs '+expected);checks++;}
const make=(uid,type='automation',extra={})=>({uid,type,page:1,x:.2,y:.4,labelX:.5,labelY:.25,...extra});

class Node {
 constructor(document,tag='div'){this.ownerDocument=document;this.tagName=tag;this.children=[];this.parent=null;this.dataset={};this.attributes={};this.textContent='';this.isConnected=true;this.styles={};this.style={setProperty:(key,value,priority)=>{this.styles[key]=String(value);this.styles[key+':priority']=priority;}};this.classes=new Set();this.classList={add:name=>this.classes.add(name),contains:name=>this.classes.has(name)};}
 setAttribute(key,value){this.attributes[key]=String(value);if(key==='class')this.classes=new Set(String(value).split(/\s+/));if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
 getAttribute(key){return this.attributes[key]??null;}
 appendChild(node){node.parent=this;this.children.push(node);return node;}
 replaceChildren(...nodes){this.children=[];nodes.forEach(node=>this.appendChild(node));}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);this.isConnected=false;}
 querySelectorAll(selector){const list=[];const visit=node=>{for(const child of node.children){if(selector[0]==='.'?child.classes.has(selector.slice(1)):child.tagName===selector)list.push(child);visit(child);}};visit(this);return list;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
class Document {createElementNS(ns,tag){return new Node(this,tag);}createElement(tag){return new Node(this,tag);}}
function fixture(items){
 const document=new Document(),container=new Node(document),svg=new Node(document,'svg');container.appendChild(svg);
 for(const item of items){
  const line=new Node(document,'line');line.setAttribute('class','secConnector');line.setAttribute('data-uid',item.uid);svg.appendChild(line);
  for(const name of ['secMarker','secTarget']){const node=new Node(document,'button');node.setAttribute('class',name);node.dataset.securityStampUid=item.uid;node.textContent=item.id||item.uid;container.appendChild(node);}
 }
 return{container,svg};
}

(async()=>{
 // Old files retain their precise module defaults; new small-page objects use100%/Normal.
 equal([Style.stampScale(make('old'),'revision'),Style.arrowScale(make('old'),'revision')],[1.77,3],'legacy revision profile');
 equal([Style.stampScale(make('old','lock'),'security'),Style.arrowScale(make('old','lock'),'security')],[1,1],'legacy Security profile');
 equal([Style.stampScale(undefined,'revision'),Style.arrowScale(undefined,'revision')],[1,1],'new object profile');
 equal(Style.applies(make('brand','fire_panel'),'security'),false,'Brand excluded');
 equal(Style.applies(make('box','detector',{detectorBox:{width:.1,height:.1,textHeight:.02,angle:0}}),'security'),false,'manual detector sizing remains independent');
 const project={},first=make('D1');Style.inherit(first,project,'revision');
 equal([first.customerStampScale,first.customerArrowScale],[1,1],'new revision stamp is100%/Normal without known large page');
 equal(Style.defaults(project),null,'creation is not an explicit size choice');
 first.customerStampScale=.75;first.customerArrowScale=1.5;
 Style.remember(project,[first],[first],{stamp:true,arrow:true},'revision');
 const second=make('D2');Style.inherit(second,project,'revision');
 equal([second.customerStampScale,second.customerArrowScale],[.75,1.5],'second stamp inherits chosen style');
 second.customerStampScale=2.2;Style.remember(project,[first,second],[second],{stamp:true},'revision');
 equal(Style.defaults(project).stampScale,.75,'individual override does not change future default');
 const third=make('D3');Style.inherit(third,project,'revision');equal(third.customerStampScale,.75,'third uses first chosen style');
 const existing=make('explicit','automation',{customerStampScale:1.2,customerArrowScale:2});Style.inherit(existing,project,'revision');equal([existing.customerStampScale,existing.customerArrowScale],[1.2,2],'inherit never overwrites individual saved values');

 // An imported project with multiple old objects may establish its first default from one explicit choice.
 const importedProject={},older=[make('A'),make('B'),make('C')],unchanged=JSON.stringify(older[1]);older[0].customerStampScale=1.4;
 Style.remember(importedProject,older,[older[0]],{stamp:true},'revision');
 equal(Style.defaults(importedProject),{version:1,stampScale:1.4,arrowScale:3},'first explicit choice in an existing project establishes default');
 equal(JSON.stringify(older[1]),unchanged,'other imported markers are not migrated');
 older[1].customerStampScale=.6;Style.remember(importedProject,older,[older[1]],{stamp:true},'revision');equal(Style.defaults(importedProject).stampScale,1.4,'later override leaves imported default');
 const soleProject={},sole=make('one');sole.customerStampScale=.9;Style.remember(soleProject,[sole],[sole],{stamp:true},'revision');sole.customerStampScale=1.1;Style.remember(soleProject,[sole],[sole],{stamp:true},'revision');equal(Style.defaults(soleProject).stampScale,1.1,'first sole marker can be refined before next placement');
 for(const item of [first,second,third])item.customerStampScale=1.25;
 Style.remember(project,[first,second,third],[first,second,third],{stamp:true},'revision',{all:true});equal(Style.defaults(project).stampScale,1.25,'all action replaces future size');
 first.customerStampScale=.5;second.customerStampScale=1.5;third.customerStampScale=2;
 for(const item of [first,second,third])item.customerStampScale*=1.1;
 Style.remember(project,[first,second,third],[first,second,third],{stamp:true},'revision',{all:true,factor:1.1});near(Style.defaults(project).stampScale,1.375,'mixed all-size adjustment applies same factor to project default');
 const persisted=JSON.parse(JSON.stringify({project,items:[first,second,third]})),reopened=make('D4');Style.inherit(reopened,persisted.project,'revision');near(reopened.customerStampScale,1.375,'default survives work-data roundtrip');equal(persisted.items[1].customerStampScale,second.customerStampScale,'individual overrides survive roundtrip');

 // Exact HelveticaBold metrics are shared by the PDF and the screen renderer.
 const font=await Style.prepare(PDFLib),item=make('D9','automation',{customerStampScale:.8,customerArrowScale:1.5});
 const before=JSON.stringify(item),short=Style.metrics(item,'D9','revision'),long=Style.metrics(item,'BYGGNAD-ÅÄÖ-1044-24-1','revision');
 near(short.textWidth,font.widthOfTextAtSize('D9',short.size),'screen and PDF use exact font widths');
 near(long.textWidth,font.widthOfTextAtSize(long.label,long.size),'long Swedish IDs use the same font width');
 assert.ok(long.boxW>short.boxW);checks++;
 const close=Style.geometry({x:1,y:1,labelX:1,labelY:1},short);equal(close.visible,false,'overlapping anchors do not draw reversed leaders');
 for(const angle of [0,90,180,270]){
  const g=Style.geometry({x:80,y:200,labelX:300,labelY:350},short,angle);
  assert.ok(Object.values(g.start).every(Number.isFinite)&&g.visible);checks++;
 }

 // Actual workspace nodes retain their button identity; zoom changes physical geometry proportionally.
 const fire=make('F1','fire_panel'),scene=fixture([item,fire]),originalButton=scene.container.querySelectorAll('.secMarker')[0];
 const labelFor=o=>o.uid,colorFor=()=>[35,131,84],scale=.7;
 Style.drawWorkspace({container:scene.container,connectorSvg:scene.svg,items:[item,fire],mode:'revision',scale,width:595*scale,height:842*scale,labelFor,colorFor});
 equal(scene.container.querySelectorAll('.secMarker')[0],originalButton,'existing protocol button and handlers are preserved');
 equal(scene.svg.querySelectorAll('.secConnector')[0].styles.display,'none','old affected connector replaced');
 equal(scene.svg.querySelectorAll('.secConnector')[1].styles.display,undefined,'unrelated Brand connector untouched');
 equal(scene.container.querySelectorAll('.cfStampGeometry').length,1,'one physical geometry layer');
 for(const zoom of [.5,1,2.44,8]){
  const nextScale=.7*zoom;Style.resizeWorkspace(scene.container,nextScale,595*nextScale,842*nextScale);
  const badge=originalButton.querySelector('.cfStampBadge');near(parseFloat(badge.styles.width)/nextScale,short.boxW+1,'chosen box width is independent of zoom');near(parseFloat(badge.styles.height)/nextScale,short.boxH+1,'chosen box height is independent of zoom');
  assert.ok(parseFloat(originalButton.styles.width)>=44&&parseFloat(originalButton.styles.height)>=44);checks++;
  equal(scene.container.querySelector('.cfStampGeometry').getAttribute('viewBox'),'0 0 595 842','drawing coordinates remain in physical points');
 }
 equal(JSON.stringify(item),before,'rendering and zoom never alter saved coordinates or style');
 const oldHeight=parseFloat(originalButton.querySelector('.cfStampBadge').styles.height),ratio=.5;Style.resizeWorkspace(scene.container,.7*8*ratio,595*.7*8*ratio,842*.7*8*ratio);
 near(parseFloat(originalButton.querySelector('.cfStampBadge').styles.height),oldHeight*ratio,'frozen-layer scaling equals final redraw size');
 item.x=.8;Style.updateWorkspaceObject(scene.container,item);const arrow=scene.container.querySelector('.cfStampGeometry').querySelector('polygon');near(Number(arrow.getAttribute('points').split(/[ ,]/)[0]),.8*595,'target drag updates physical arrowhead');equal(item.customerStampScale,.8,'drag leaves chosen size unchanged');
 for(const angle of [90,180,270]){
  const side=angle%180!==0,width=side?842:595,height=side?595:842;
  Style.drawWorkspace({container:scene.container,connectorSvg:scene.svg,items:[item],mode:'revision',scale:1,width,height,labelFor,colorFor,pointFor:(x,y)=>Style.rotatePoint(x,y,angle)});
  const point=Style.rotatePoint(item.labelX,item.labelY,angle);equal(originalButton.style.left,point.x*100+'%','rotated stamp stays at its normalized anchor');near(parseFloat(originalButton.querySelector('.cfStampBadge').styles.width),short.boxW+1,'rotation preserves stamp width');
 }

 // Build real PDF bytes and confirm workspace geometry has no effect on the export result.
 const viewport={width:595,height:842,convertToPdfPoint:(x,y)=>[x,842-y]};
 const out=await PDFLib.PDFDocument.create(),pg=out.addPage([595,842]),pdfFont=await out.embedFont(PDFLib.StandardFonts.HelveticaBold);
 const savedBefore=JSON.stringify(item),rendered=Style.drawPdf(pg,item,{mode:'revision',font:pdfFont,viewport,library:PDFLib,label:'D9',color:[35,131,84]});
 near(rendered.metrics.boxW,short.boxW,'PDF and workspace share chosen box width');near(rendered.metrics.boxH,short.boxH,'PDF and workspace share chosen box height');equal(JSON.stringify(item),savedBefore,'PDF export never changes work data');
 const loaded=await PDFLib.PDFDocument.load(await out.save());equal(loaded.getPageCount(),1,'real PDF output roundtrip');equal(loaded.getPage(0).getSize(),{width:595,height:842},'page geometry preserved');
 const calls=[];const fakePage={drawLine:o=>calls.push(['line',o]),drawSvgPath:(path,o)=>calls.push(['path',path,o]),drawCircle:o=>calls.push(['circle',o]),drawRectangle:o=>calls.push(['rect',o]),drawText:(text,o)=>calls.push(['text',text,{...o,font:undefined}])};
 Style.drawPdf(fakePage,item,{mode:'revision',font:pdfFont,viewport,library:PDFLib,label:'D9'});const ops=JSON.stringify(calls);calls.length=0;
 Style.resizeWorkspace(scene.container,5,595*5,842*5);Style.drawPdf(fakePage,item,{mode:'revision',font:pdfFont,viewport,library:PDFLib,label:'D9'});equal(JSON.stringify(calls),ops,'PDF operations identical after a different workspace zoom');
 const security=make('L1','lock',{customerStampScale:1.2,customerArrowScale:2}),rotated=Style.drawPdf(fakePage,security,{mode:'security',font:pdfFont,viewport,viewViewport:{width:842,height:595},viewRotation:90,angle:90,library:PDFLib,label:'Lås 1'});
 equal([rotated.stampRect.x,rotated.stampRect.y,rotated.stampRect.rotation],[.75,.5,90],'customer editor handles use rotated view coordinates');near(rotated.stampRect.width*842,rotated.metrics.boxW,'rotated customer preview retains physical width');
 equal(Style.drawPdf(fakePage,fire,{mode:'security'}),null,'Brand export uses its original builder');
 console.log('controlflow-stamp-style-v549: '+checks+' assertions passed (state, geometry, DOM contract and real PDF bytes).');
})().catch(error=>{console.error(error);process.exitCode=1;});
