/* Shared physical stamp geometry for Kontrollflöde. Values are PDF points, never UI pixels.
 * v550 gives all objects the same solid arrow; v552 defaults new A3+ labels to 50% and new arrows to Normal.
 * Existing objects keep their saved values and their legacy missing-value profiles. */
(function (root, factory) {
 'use strict';
 const api = factory();
 if (typeof module === 'object' && module.exports) module.exports = api;
 else root.ControlflowStampStyle = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
 'use strict';
 const NS = 'http://www.w3.org/2000/svg';
 const DEFAULT_KEY = 'controlflowStampDefaults';
 const limits = Object.freeze({stampMin:.25,stampMax:3,arrowMin:.5,arrowMax:3,newArrowScale:1});
 const largePage = Object.freeze({shortSide:297*72/25.4,longSide:420*72/25.4,tolerance:1});
 const workspace = new WeakMap();
 const pageSizes = new WeakMap();
 let fontPromise = null, standardFont = null;
 const finite = (n, fallback) => Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : fallback;
 const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
 const stampTypes = new Set(['detector','alarm','lock','access','automation','automation_selfcheck','lock_revision']);
 const modes = {security:stampTypes,revision:stampTypes};
 function applies(item, mode = 'security') {
  return !!item && !!modes[mode]?.has(item.type) && !(item.type === 'detector' && item.detectorBox);
 }
 function stampScale(item, mode = 'security') {
  // No object means the reset/new-object standard. Missing values on old objects keep their old PDF profile.
  const minimum=!item||applies(item,mode)?limits.stampMin:.5;
  return clamp(finite(item?.customerStampScale, item && mode === 'revision' ? 1.77 : 1), minimum, limits.stampMax);
 }
 function arrowScale(item, mode = 'security') {
  const minimum=!item||applies(item,mode)?limits.arrowMin:1;
  return clamp(finite(item?.customerArrowScale, item ? (mode === 'revision' ? 3 : 1) : limits.newArrowScale), minimum, limits.arrowMax);
 }
 function defaults(project) {
  const value = project?.[DEFAULT_KEY];
  if (!value || value.version !== 1 || !Number.isFinite(value.stampScale) || !Number.isFinite(value.arrowScale)) return null;
  return {version:1,stampScale:clamp(value.stampScale,limits.stampMin,limits.stampMax),arrowScale:clamp(value.arrowScale,limits.arrowMin,limits.arrowMax)};
 }
 function physicalPageSize(page) {
  if(!page||typeof page!=='object')return null;
  let width,height;
  if(Array.isArray(page.view)&&page.view.length>=4&&page.view.slice(0,4).every(Number.isFinite)){
   const unit=finite(page.userUnit,1);width=Math.abs(page.view[2]-page.view[0])*unit;height=Math.abs(page.view[3]-page.view[1])*unit;
  }else if(Number.isFinite(page.width)&&Number.isFinite(page.height)){
   ({width,height}=page);
  }else if(typeof page.getViewport==='function'){
   try{({width,height}=page.getViewport({scale:1}));}catch(_){return null;}
  }
  return Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0?Object.freeze({width,height}):null;
 }
 function rememberPageSize(document,pageNumber,pdfPage) {
  if(!document||typeof document!=='object'||!Number.isInteger(pageNumber)||pageNumber<1)return null;
  const size=physicalPageSize(pdfPage);if(!size)return null;
  let sizes=pageSizes.get(document);if(!sizes){sizes=new Map();pageSizes.set(document,sizes);}
  sizes.set(pageNumber,size);return size;
 }
 function pageSize(document,pageNumber) {return pageSizes.get(document)?.get(pageNumber)||null;}
 function isLargeDrawing(page) {
  const size=physicalPageSize(page);if(!size)return false;
  const short=Math.min(size.width,size.height),long=Math.max(size.width,size.height);
  return short+largePage.tolerance>=largePage.shortSide&&long+largePage.tolerance>=largePage.longSide;
 }
 function inherit(item, project, mode = 'security', page = null) {
  if (!applies(item, mode)) return item;
  const chosen = defaults(project) || {stampScale:isLargeDrawing(page) ? .5 : 1,arrowScale:limits.newArrowScale};
  if (!Number.isFinite(Number(item.customerStampScale)) || Number(item.customerStampScale) <= 0) item.customerStampScale = chosen.stampScale;
  if (!Number.isFinite(Number(item.customerArrowScale)) || Number(item.customerArrowScale) <= 0) item.customerArrowScale = chosen.arrowScale;
  // Creating an object is not a user size choice. Do not establish a project default here.
  return item;
 }
 function common(list, read) {
  if (!list.length) return null;
  const first = read(list[0]);
  return list.every(item => Math.abs(read(item)-first)<1e-8) ? first : null;
 }
 function remember(project, allItems, changedItems, fields, mode = 'security', options = {}) {
  if (!project || typeof project !== 'object') return false;
  const eligible = (allItems || []).filter(item => applies(item, mode));
  const changed = (changedItems || []).filter(item => applies(item, mode));
  if (!changed.length) return false;
  const previous = defaults(project);
  // First explicit choice establishes the project default, including an imported project.
  // Once set, an individual adjustment does not affect future objects unless it is the only object.
  if (previous && !options.all && eligible.length !== 1) return false;
  const readStamp = item => stampScale(item, mode), readArrow = item => arrowScale(item, mode);
  const next = previous || {version:1,stampScale:common(changed,readStamp) ?? 1,arrowScale:common(changed,readArrow) ?? limits.newArrowScale};
  if (fields?.stamp) {
   const same = common(changed,readStamp);
   if (same !== null) next.stampScale = same;
   else if (Number.isFinite(options.delta)) next.stampScale = clamp(next.stampScale+options.delta,limits.stampMin,limits.stampMax);
   else if (Number.isFinite(options.factor) && options.factor>0) next.stampScale = clamp(next.stampScale*options.factor,limits.stampMin,limits.stampMax);
  }
  if (fields?.arrow) {
   const same = common(changed,readArrow);
   if (same !== null) next.arrowScale = same;
  }
  project[DEFAULT_KEY] = {...next,version:1};
  return true;
 }
 async function prepare(library) {
  if (standardFont) return standardFont;
  if (!fontPromise) {
   if (!library?.PDFDocument || !library?.StandardFonts) return null;
   fontPromise = library.PDFDocument.create().then(doc => doc.embedFont(library.StandardFonts.HelveticaBold)).then(font => (standardFont=font)).catch(error => {fontPromise=null;throw error;});
  }
  return fontPromise;
 }
 function measureLabel(label, size, measure) {
  const reader = measure || (standardFont && ((value, points) => standardFont.widthOfTextAtSize(value, points)));
  if (reader) return Math.max(0, reader(label, size));
  // Only a pre-load fallback. Entry-point renderers await prepare() before opening a PDF.
  return label.length * size * .6;
 }
 function metrics(item, label, mode = 'security', measure) {
  label = String(label ?? '');
  const stamp = stampScale(item, mode), arrow = arrowScale(item, mode);
  const automation = ['automation','automation_selfcheck'].includes(item?.type);
  const size = (automation ? (label.length>18?13.2:15.4) : (label.length>18?9.2:10.8))*stamp;
  const textWidth = measureLabel(label,size,measure);
  return {label,stampScale:stamp,arrowScale:arrow,size,textWidth,
   boxW:Math.max(42*stamp,textWidth+16*stamp),boxH:size+10*stamp,border:Math.min(1,stamp*2),
   stroke:1.25*arrow,headLength:7*Math.sqrt(arrow),headWidth:3.5*Math.sqrt(arrow)};
 }
 function geometry(points, dimensions, angle = 0) {
  const {x,y,labelX:lx,labelY:ly} = points, dx=x-lx, dy=y-ly;
  const distance=Math.hypot(dx,dy), divisor=Math.max(.001,distance), ux=dx/divisor, uy=dy/divisor;
  const radians=angle*Math.PI/180, cos=Math.cos(radians), sin=Math.sin(radians);
  const localX=cos*ux+sin*uy, localY=-sin*ux+cos*uy;
  const edge=distance<1e-8?0:Math.min(Math.abs(localX)>.0001?dimensions.boxW/2/Math.abs(localX):Infinity,Math.abs(localY)>.0001?dimensions.boxH/2/Math.abs(localY):Infinity);
  const px=-uy, py=ux;
  // Keep short leaders outside the label. At normal spacing the head is exactly
  // 7 × 7 points; only an almost touching anchor shortens it proportionally.
  const headLength=Math.min(dimensions.headLength,Math.max(0,distance-edge));
  const headWidth=dimensions.headWidth*headLength/dimensions.headLength;
  const overlap=Math.min(dimensions.stroke/2,headLength/4);
  return {x,y,lx,ly,distance,visible:distance>edge+3.5,
   start:{x:lx+ux*edge,y:ly+uy*edge},end:{x:x-ux*(headLength-overlap),y:y-uy*(headLength-overlap)},
   headA:{x:x-ux*headLength+px*headWidth,y:y-uy*headLength+py*headWidth},
   headB:{x:x-ux*headLength-px*headWidth,y:y-uy*headLength-py*headWidth},
   box:{x:lx-cos*dimensions.boxW/2+sin*dimensions.boxH/2,y:ly-sin*dimensions.boxW/2-cos*dimensions.boxH/2},
   text:{x:lx-dimensions.textWidth/2*cos+dimensions.size/3*sin,y:ly-dimensions.textWidth/2*sin-dimensions.size/3*cos}};
 }
 function rotatePoint(x,y,angle=0) {
  switch((angle%360+360)%360) {case 90:return{x:1-y,y:x};case 180:return{x:1-x,y:1-y};case 270:return{x:y,y:1-x};default:return{x,y};}
 }
 function drawPdf(pg, item, options) {
  const {mode='security',font,viewport,viewViewport=viewport,angle=0,viewRotation=0,library,label,color=[119,133,142]}=options;
  if (!applies(item,mode)) return null;
  const m=metrics(item,label,mode,(value,size)=>font.widthOfTextAtSize(value,size));
  const [x,y]=viewport.convertToPdfPoint(item.x*viewport.width,item.y*viewport.height);
  const [lx,ly]=viewport.convertToPdfPoint(item.labelX*viewport.width,item.labelY*viewport.height);
  const g=geometry({x,y,labelX:lx,labelY:ly},m,angle),c=library.rgb(...color.map(value=>value/255)),white=library.rgb(1,1,1);
  if(g.visible) {
   pg.drawLine({start:g.start,end:g.end,thickness:m.stroke,color:c,lineCap:library.LineCapStyle.Round});
   // pdf-lib inverts SVG's y-axis. Negating the PDF coordinates gives this
   // filled triangle exactly the same anchor and vertices as the workspace.
   pg.drawSvgPath(`M ${x} ${-y} L ${g.headA.x} ${-g.headA.y} L ${g.headB.x} ${-g.headB.y} Z`,{x:0,y:0,color:c,borderWidth:0});
  }
  // The former revision tip circle is intentionally absent in both outputs.
  pg.drawRectangle({...g.box,width:m.boxW,height:m.boxH,color:c,borderColor:white,borderWidth:m.border,rotate:library.degrees(angle)});
  pg.drawText(m.label,{...g.text,size:m.size,font,color:white,rotate:library.degrees(angle)});
  const stampPoint=rotatePoint(item.labelX,item.labelY,viewRotation);
  return {metrics:m,geometry:g,
   stampRect:{uid:item.uid,pageIndex:item.page-1,x:stampPoint.x,y:stampPoint.y,width:m.boxW/viewViewport.width,height:m.boxH/viewViewport.height,rotation:viewRotation},
   link:{uid:item.uid,pageIndex:item.page-1,x:lx,y:ly,radius:Math.max(m.boxW,m.boxH)/2+4}};
 }
 function svgElement(document,name,attributes={}) {
  const element=document.createElementNS(NS,name);
  for(const [key,value]of Object.entries(attributes))element.setAttribute(key,String(value));
  return element;
 }
 function important(node,values) {for(const[key,value]of Object.entries(values))node.style.setProperty(key,String(value),'important');}
 function rgbText(value) {return Array.isArray(value)?'rgb('+value.join(',')+')':String(value||'#77858e');}
 function lineAttributes(line,start,end,width,color) {
  for(const[key,value]of Object.entries({x1:start.x,y1:start.y,x2:end.x,y2:end.y,'stroke-width':width,stroke:color,'stroke-linecap':'round'}))line.setAttribute(key,String(value));
 }
 function updateWorkspaceObject(container,item) {
  const context=workspace.get(container),entry=context?.entries.get(item?.uid);
  if(!entry)return false;
  const m=metrics(item,context.labelFor(item),context.mode),color=rgbText(context.colorFor(item));
  const anchor=context.pointFor(item.x,item.y),label=context.pointFor(item.labelX,item.labelY);
  const naturalW=context.width/context.scale,naturalH=context.height/context.scale;
  const g=geometry({x:anchor.x*naturalW,y:anchor.y*naturalH,labelX:label.x*naturalW,labelY:label.y*naturalH},m);
  entry.group.setAttribute('data-object-uid',item.uid);
  for(const node of [entry.shaft,entry.head])node.setAttribute('visibility',g.visible?'visible':'hidden');
  lineAttributes(entry.shaft,g.start,g.end,m.stroke,color);
  entry.head.setAttribute('points',`${g.x},${g.y} ${g.headA.x},${g.headA.y} ${g.headB.x},${g.headB.y}`);
  entry.head.setAttribute('fill',color);
  if(entry.button) {
   const button=entry.button,visibleW=(m.boxW+m.border)*context.scale,visibleH=(m.boxH+m.border)*context.scale;
   important(button,{width:Math.max(44,visibleW)+'px',height:Math.max(44,visibleH)+'px','min-width':'0','max-width':'none','min-height':'0','max-height':'none',padding:'0',background:'transparent',border:'0','border-radius':'0','box-shadow':'none',overflow:'visible','line-height':'normal','text-overflow':'clip'});
   button.style.left=label.x*100+'%';button.style.top=label.y*100+'%';button.setAttribute('aria-label',m.label);
   const key=JSON.stringify([m.label,m.boxW,m.boxH,m.size,m.textWidth,color]);
   if(entry.badgeKey!==key) {
    const badge=svgElement(container.ownerDocument,'svg',{class:'cfStampBadge',viewBox:[-(m.boxW+m.border)/2,-(m.boxH+m.border)/2,m.boxW+m.border,m.boxH+m.border].join(' '),'aria-hidden':'true',focusable:'false'});
    badge.appendChild(svgElement(container.ownerDocument,'rect',{x:-m.boxW/2,y:-m.boxH/2,width:m.boxW,height:m.boxH,fill:color,stroke:'#fff','stroke-width':m.border}));
    const text=svgElement(container.ownerDocument,'text',{x:-m.textWidth/2,y:m.size/3,fill:'#fff','font-family':'Helvetica,Arial,sans-serif','font-weight':'700','font-size':m.size,textLength:m.textWidth,lengthAdjust:'spacingAndGlyphs'});
    important(text,{'font-size':m.size+'px','font-weight':'700','letter-spacing':'normal'});text.textContent=m.label;badge.appendChild(text);
    button.replaceChildren(badge);entry.badge=badge;entry.badgeKey=key;
   }
   important(entry.badge,{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',width:visibleW+'px',height:visibleH+'px','max-width':'none','max-height':'none',overflow:'visible','pointer-events':'none'});
  }
  if(entry.target) {
   entry.target.style.left=anchor.x*100+'%';entry.target.style.top=anchor.y*100+'%';
   important(entry.target,{width:'44px',height:'44px','min-width':'44px','max-width':'44px','min-height':'44px','max-height':'44px',padding:'0',background:'transparent',border:'0','box-shadow':'none',overflow:'visible'});
  }
  return true;
 }
 function drawWorkspace(options) {
  const {container,connectorSvg,items,mode='security',scale,width,height,labelFor,colorFor,pointFor=(x,y)=>({x,y})}=options;
  if(!container||!Number.isFinite(scale)||scale<=0||width<=0||height<=0)return;
  container.querySelector('.cfStampGeometry')?.remove();
  const layer=svgElement(container.ownerDocument,'svg',{class:'cfStampGeometry',viewBox:[0,0,width/scale,height/scale].join(' '),preserveAspectRatio:'none','aria-hidden':'true',focusable:'false'});
  important(layer,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'visible','pointer-events':'none','z-index':'1'});
  const context={container,layer,mode,scale,width,height,labelFor,colorFor:colorFor||(()=>[119,133,142]),pointFor,entries:new Map()};
  workspace.set(container,context);
  const nodeUid=node=>node.dataset.objectUid||node.dataset.securityStampUid;
  const badges=new Map(Array.from(container.querySelectorAll('.secMarker')).map(node=>[nodeUid(node),node]));
  const targets=new Map(Array.from(container.querySelectorAll('.secTarget')).map(node=>[nodeUid(node),node]));
  const lines=new Map(Array.from(connectorSvg?.querySelectorAll('.secConnector')||[]).map(node=>[node.getAttribute('data-uid'),node]));
  for(const item of items.filter(item=>applies(item,mode))) {
   const group=svgElement(container.ownerDocument,'g'),shaft=svgElement(container.ownerDocument,'line'),head=svgElement(container.ownerDocument,'polygon');
   group.appendChild(shaft);group.appendChild(head);layer.appendChild(group);
   const button=badges.get(item.uid),target=targets.get(item.uid);
   if(button)button.classList.add('cfStampPhysical');if(target)target.classList.add('cfStampTarget');
   if(lines.has(item.uid))important(lines.get(item.uid),{display:'none'});
   context.entries.set(item.uid,{item,group,shaft,head,button,target,badgeKey:null,badge:null});
  }
  container.appendChild(layer);
  for(const {item}of context.entries.values())updateWorkspaceObject(container,item);
 }
 function resizeWorkspace(container,scale,width,height) {
  const context=workspace.get(container);
  if(!context||!context.layer.isConnected||!Number.isFinite(scale)||scale<=0||width<=0||height<=0)return false;
  Object.assign(context,{scale,width,height});context.layer.setAttribute('viewBox',[0,0,width/scale,height/scale].join(' '));
  for(const {item}of context.entries.values())updateWorkspaceObject(container,item);
  return true;
 }
 return Object.freeze({version:1,DEFAULT_KEY,limits,largePage,applies,stampScale,arrowScale,defaults,physicalPageSize,rememberPageSize,pageSize,isLargeDrawing,inherit,remember,prepare,metrics,geometry,rotatePoint,drawPdf,drawWorkspace,updateWorkspaceObject,resizeWorkspace});
});
