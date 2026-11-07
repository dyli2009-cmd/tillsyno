/* Selected raster geometry for Ritningsverktygets searchable-text preparation. */
(()=>{
 'use strict';
 const scope=typeof window==='undefined'?globalThis:window;
 const pages=new WeakMap(),identity=[1,0,0,1,0,0];
 const matrix=m=>m&&m.length===6&&Array.from(m).every(Number.isFinite);
 function multiply(a,b){
  return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
 }
 function validRect(rect){return rect&&['x','y','w','h'].every(k=>Number.isFinite(rect[k]))&&rect.w>0&&rect.h>0;}
 function overlap(a,b){
  // Retain edge-adjacent images when selection rounding is involved.
  const tolerance=.000001;
  return a.x+a.w>=b.x-tolerance&&b.x+b.w>=a.x-tolerance&&a.y+a.h>=b.y-tolerance&&b.y+b.h>=a.y-tolerance;
 }
 async function classify(page,ops){
  try{
   const list=await page.getOperatorList({annotationMode:0}),vp=page.getViewport({scale:1});
   if(!list||!Array.isArray(list.fnArray)||!Array.isArray(list.argsArray)||list.fnArray.length!==list.argsArray.length||!(vp.width>0&&vp.height>0))return {unknown:true,boxes:[]};
   const names=new Map(Object.entries(ops).map(([name,id])=>[id,name]));
   const result={unknown:false,boxes:[]},stack=[];
   let current=identity.slice();
   function save(kind){stack.push({matrix:current,kind});current=current.slice();}
   function restore(kind){
    const state=stack.pop();
    if(!state||state.kind!==kind){result.unknown=true;return;}
    current=state.matrix;
   }
   function transform(value){
    if(!matrix(value)){result.unknown=true;return;}
    current=multiply(current,value);
   }
   function image(local){
    if(!matrix(local)){result.unknown=true;return;}
    const ctm=multiply(current,local),points=[[0,0],[1,0],[0,1],[1,1]].map(([x,y])=>{
     const px=ctm[0]*x+ctm[2]*y+ctm[4],py=ctm[1]*x+ctm[3]*y+ctm[5];
     if(typeof vp.convertToViewportPoint==='function')return vp.convertToViewportPoint(px,py);
     if(matrix(vp.transform))return [vp.transform[0]*px+vp.transform[2]*py+vp.transform[4],vp.transform[1]*px+vp.transform[3]*py+vp.transform[5]];
     return [NaN,NaN];
    });
    if(!points.every(point=>point&&point.length>=2&&Number.isFinite(point[0])&&Number.isFinite(point[1]))){result.unknown=true;return;}
    const x=Math.min(...points.map(p=>p[0]))/vp.width,y=Math.min(...points.map(p=>p[1]))/vp.height;
    const box={x,y,w:Math.max(...points.map(p=>p[0]))/vp.width-x,h:Math.max(...points.map(p=>p[1]))/vp.height-y};
    if(box.w>0&&box.h>0)result.boxes.push(box);
   }
   function repeated(positions,base){
    if(!positions||positions.length%2||!Array.from(positions).every(Number.isFinite)||!matrix(base)){result.unknown=true;return;}
    for(let n=0;n<positions.length;n+=2)image([base[0],base[1],base[2],base[3],positions[n],positions[n+1]]);
   }
   for(let i=0;i<list.fnArray.length;i++){
    const name=names.get(list.fnArray[i]),args=list.argsArray[i]||[];
    if(!name){result.unknown=true;continue;}
    switch(name){
     case 'save':save('save');break;
     case 'restore':restore('save');break;
     case 'transform':transform(args);break;
     case 'paintFormXObjectBegin':
      save('form');if(args[0]!=null)transform(args[0]);break;
     case 'paintFormXObjectEnd':restore('form');break;
     case 'beginGroup':
      save('group');if(args[0]?.matrix!=null)transform(args[0].matrix);break;
     case 'endGroup':restore('group');break;
     case 'paintImageXObject':case 'paintInlineImageXObject':case 'paintImageMaskXObject':case 'paintSolidColorImageMask':case 'paintJpegXObject':
      image(identity);break;
     case 'paintImageXObjectRepeat':
      repeated(args[3],[args[1],0,0,args[2],0,0]);break;
     case 'paintImageMaskXObjectRepeat':
      repeated(args[5],[args[1],args[2]??0,args[3]??0,args[4],0,0]);break;
     case 'paintImageMaskXObjectGroup':case 'paintInlineImageXObjectGroup':{
      const group=name==='paintImageMaskXObjectGroup'?args[0]:args[1];
      if(!Array.isArray(group)){result.unknown=true;break;}
      for(const entry of group)image(entry?.transform);
      break;
     }
     case 'beginAnnotation':case 'endAnnotation':
      // Annotation appearances are excluded by the caller's render mode. If a
      // provider returns them anyway, their transforms are not safe to guess.
      result.unknown=true;break;
     case 'setFillColorN':case 'setStrokeColorN':
      // Tiling-pattern operator lists can contain raster images of their own.
      if(args.some(value=>Array.isArray(value)&&value[0]==='TilingPattern'||value==='TilingPattern'))result.unknown=true;
      break;
     default:
      if(/image/i.test(name))result.unknown=true;
    }
   }
   if(stack.length)result.unknown=true;
   return result;
  }catch(_){return {unknown:true,boxes:[]};}
 }
 async function inspect(page,rect={x:0,y:0,w:1,h:1},library){
  // Unknown geometry keeps the existing OCR fallback; only a proven empty
  // selection can skip image reading. Normalized viewport coordinates match
  // the user's selection on rotated and cropped pages as well.
  if(!page||!validRect(rect))return {unknown:true,boxes:[],hasImages:true};
  const ops=library?.OPS||scope.pdfjsLib?.OPS||scope.PDFJS?.OPS;
  if(!ops||typeof page.getOperatorList!=='function')return {unknown:true,boxes:[],hasImages:true};
  let pending=pages.get(page);
  if(!pending){pending=classify(page,ops);pages.set(page,pending);}
  const result=await pending;
  return {...result,hasImages:result.unknown||result.boxes.some(box=>overlap(box,rect))};
 }
 async function hasImages(page,rect,library){return (await inspect(page,rect,library)).hasImages;}
 const api=Object.freeze({inspect,hasImages});
 scope.DrawingOcrImageRegions=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
