/* Detector scan TEST 0.2. PDF and raster geometry only; no project or network side effects. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DetectorScanCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const identity=()=>[1,0,0,1,0,0];
 const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
 const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
 const bounds=points=>({left:Math.min(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),right:Math.max(...points.map(p=>p[0])),bottom:Math.max(...points.map(p=>p[1]))});
 function rectangle(points){
  if(points.length>1&&Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<.3)points=points.slice(0,-1);
  if(points.length!==4)return null;
  const b=bounds(points),w=b.right-b.left,h=b.bottom-b.top,t=.35;
  if(w<2||h<2)return null;
  for(let i=0;i<4;i++){const a=points[i],c=points[(i+1)%4];if(Math.abs(a[0]-c[0])>t&&Math.abs(a[1]-c[1])>t)return null;}
  if(new Set(points.map(p=>(Math.abs(p[0]-b.left)<t?'L':'R')+(Math.abs(p[1]-b.top)<t?'T':'B'))).size!==4)return null;
  return b;
 }
 function framesFromOperators(list,OPS,viewport){
  let state={matrix:identity(),black:true,opacity:1,dashed:false},stack=[],paths=[],current=null;const frames=[];
  const flush=()=>{if(current){paths.push(current);current=null;}};
  const paint=stroke=>{flush();if(stroke&&state.black&&state.opacity>.7&&!state.dashed)for(const path of paths){if(path.curved)continue;const b=rectangle(path.points);if(b&&(b.right-b.left)<viewport.width*.2&&(b.bottom-b.top)<viewport.height*.2)frames.push(b);}paths=[];};
  for(let i=0;i<list.fnArray.length;i++){
   const fn=list.fnArray[i],a=list.argsArray[i]||[];
   if(fn===OPS.save)stack.push({...state,matrix:state.matrix.slice()});
   else if(fn===OPS.restore){if(stack.length)state=stack.pop();}
   else if(fn===OPS.transform)state.matrix=multiply(state.matrix,a);
   else if(fn===OPS.paintFormXObjectBegin){stack.push({...state,matrix:state.matrix.slice()});if(a[0])state.matrix=multiply(state.matrix,a[0]);}
   else if(fn===OPS.paintFormXObjectEnd){if(stack.length)state=stack.pop();}
   else if(fn===OPS.setStrokeRGBColor)state.black=a.length>=3&&Math.max(...a.slice(0,3))<=65;
   else if(fn===OPS.setStrokeGray)state.black=a[0]<=.25;
   else if(fn===OPS.setStrokeCMYKColor)state.black=a[3]>=.75;
   else if(fn===OPS.setDash)state.dashed=!!a[0]?.length;
   else if(fn===OPS.setGState){for(const [key,value]of a[0]||[])if(key==='CA')state.opacity=value;}
   else if(fn===OPS.constructPath){
    const matrix=multiply(viewport.transform,state.matrix),coords=a[1];let k=0;
    for(const op of a[0]){
     if(op===OPS.moveTo){flush();current={points:[point(matrix,coords[k++],coords[k++])]};}
     else if(op===OPS.lineTo){const p=point(matrix,coords[k++],coords[k++]);if(current)current.points.push(p);}
     else if(op===OPS.rectangle){flush();const x=coords[k++],y=coords[k++],w=coords[k++],h=coords[k++];paths.push({points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(p=>point(matrix,...p))});}
     else if(op===OPS.closePath)flush();
     else{if(current)current.curved=true;k+=op===OPS.curveTo?6:op===OPS.curveTo2||op===OPS.curveTo3?4:0;}
    }
   }else if([OPS.stroke,OPS.closeStroke,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke].includes(fn))paint(true);
   else if([OPS.fill,OPS.eoFill,OPS.endPath].includes(fn))paint(false);
  }
  // PDF content streams can still contain the entire original sheet after a
  // CropBox edit. Only create detector candidates on the visible drawing.
  return frames.filter(b=>b.left>=-.25&&b.top>=-.25&&b.right<=viewport.width+.25&&b.bottom<=viewport.height+.25);
 }
 function textGeometry(item,styles,viewport){
  const m=multiply(viewport.transform,item.transform),height=Math.hypot(m[2],m[3]),len=Math.hypot(m[0],m[1]);
  if(!height||!len)return null;
  const u=[m[0]/len,m[1]/len],v=[m[2]/height,m[3]/height],width=item.width*viewport.scale,style=styles[item.fontName]||{},asc=Number.isFinite(style.ascent)?style.ascent:.8,desc=Number.isFinite(style.descent)?style.descent:-.2;
  const corners=[[0,desc*height],[width,desc*height],[width,asc*height],[0,asc*height]].map(([x,y])=>[m[4]+x*u[0]+y*v[0],m[5]+x*u[1]+y*v[1]]);
  const box=bounds(corners);return {...box,text:item.str.trim(),height,width,angle:Math.atan2(u[1],u[0])*180/Math.PI,cx:(box.left+box.right)/2,cy:(box.top+box.bottom)/2};
 }
 function overlap(a,b){const intersection=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));return intersection/Math.min((a.right-a.left)*(a.bottom-a.top),(b.right-b.left)*(b.bottom-b.top));}
 function matchNumbers(frames,textContent,viewport,page){
  const texts=textContent.items.filter(t=>t.str?.trim()).map(t=>textGeometry(t,textContent.styles||{},viewport)).filter(Boolean),found=[];
  for(const box of frames){
   const inside=texts.filter(t=>t.cx>box.left&&t.cx<box.right&&t.cy>box.top&&t.cy<box.bottom);
   if(!inside.length||inside.some(t=>!/^\d+$/.test(t.text)))continue;
   const angle=inside[0].angle,rad=angle*Math.PI/180;
   if(inside.some(t=>Math.abs(t.angle-angle)>2))continue;
   inside.sort((a,b)=>(a.cx-b.cx)*Math.cos(rad)+(a.cy-b.cy)*Math.sin(rad));
   const content=bounds(inside.flatMap(t=>[[t.left,t.top],[t.right,t.bottom]])),short=Math.min(box.right-box.left,box.bottom-box.top),h=Math.max(...inside.map(t=>t.height)),pad=h*.18;
   if(h<short*.35||h>short*1.5||content.left<box.left-pad||content.right>box.right+pad||content.top<box.top-pad||content.bottom>box.bottom+pad)continue;
   if(Math.max(box.right-box.left,box.bottom-box.top)>Math.max(content.right-content.left,content.bottom-content.top)+h*3)continue;
   const code=inside.map(t=>t.text).join('');
   if(found.some(f=>f.code===code&&overlap(f.box,box)>.75))continue;
   found.push({code,page,box,x:(box.left+box.right)/2/viewport.width,y:(box.top+box.bottom)/2/viewport.height,width:(box.right-box.left)/viewport.width,height:(box.bottom-box.top)/viewport.height,textHeight:h/viewport.height,angle});
  }
  return found.sort((a,b)=>a.y-b.y||a.x-b.x).map(({box,...hit})=>hit);
 }
 // Appearance is independent of the number. Dimensions use unzoomed PDF units.
 function validProfile(p){return !!p&&p.version===1&&[p.width,p.height,p.textHeight].every(n=>Number.isFinite(n)&&n>0)&&Number.isFinite(p.angle);}
 function similarFrame(b,p,scale=1,scan=false){
  if(!validProfile(p))return false;
  const w=(b.right-b.left)/scale,h=(b.bottom-b.top)/scale,short=Math.min(w,h),long=Math.max(w,h),sampleShort=Math.min(p.width,p.height),sampleLong=Math.max(p.width,p.height);
  return short>=sampleShort*(scan ? .35 : .55)&&short<=sampleShort*(scan?2.7:1.8)&&long<=Math.max(sampleLong*(scan?3:2),sampleShort*(scan?14:10));
 }
 // matchNumbers already validates that the digits fit their own frame. A different
 // font size inside a matching frame must not be rejected by the sample's font.
 function filterByProfile(hits,p,viewport,scan=false){return hits.filter(h=>similarFrame({left:0,top:0,right:h.width*viewport.width,bottom:h.height*viewport.height},p,1,scan));}
 function confirmedSampleHit(p,viewport,page){
  if(!validProfile(p)||p.confirmed!==true||p.page!==page||!/^\d+$/.test(p.code)||![p.x,p.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))return null;
  return{code:p.code,page,x:p.x,y:p.y,width:p.width/viewport.width,height:p.height/viewport.height,textHeight:p.textHeight/viewport.height,angle:p.angle,confirmed:true};
 }
 function consensusNumber(readings){
  const votes=new Map();
  for(const r of readings){const code=String(r?.text||'').trim().replace(/\s+/g,'');if(!/^\d+$/.test(code)||!Number.isFinite(r.confidence)||r.confidence<80)continue;const list=votes.get(code)||[];list.push(r.confidence);votes.set(code,list);}
  const ranked=[...votes].sort((a,b)=>b[1].length-a[1].length);
  if(!ranked.length||ranked[0][1].length<2||ranked[1]?.[1].length===ranked[0][1].length)return null;
  return{code:ranked[0][0],confidence:Math.min(...ranked[0][1])};
 }
 function hasFrameInk(image,box){
  const inset=Math.max(2,Math.min(box.right-box.left,box.bottom-box.top)*.15),left=Math.max(0,Math.ceil(box.left+inset)),right=Math.min(image.width,Math.floor(box.right-inset)),top=Math.max(0,Math.ceil(box.top+inset)),bottom=Math.min(image.height,Math.floor(box.bottom-inset));
  if(right<=left||bottom<=top)return true; // Let the full-resolution reader decide.
  const needed=Math.max(2,Math.ceil((right-left)*(bottom-top)*.005));let count=0;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const i=(y*image.width+x)*4;if(image.data[i+3]>100&&Math.max(image.data[i],image.data[i+1],image.data[i+2])<150&&++count>=needed)return true;}
  return false;
 }
 function inkBounds(image){
  let left=image.width,top=image.height,right=-1,bottom=-1;
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const i=(y*image.width+x)*4;if(image.data[i+3]>100&&Math.max(image.data[i],image.data[i+1],image.data[i+2])<180){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
  return right<left?null:{left,top,width:right-left+1,height:bottom-top+1};
 }
 // Read the visible border, irrespective of how PDF paths were constructed.
 // A row run is a horizontal edge; two edges must have matching, covered sides.
 function framesFromPixels(image,profile,scale=1,scan=false){
  const {width:w,height:h,data}=image,dark=new Uint8Array(w*h),lines=[],active=new Map(),short=Math.min(profile.width,profile.height)*scale;
  const min=Math.max(6,Math.floor(short*(scan ? .3 : .5))),max=Math.min(Math.max(w,h),Math.ceil(Math.max(profile.width,profile.height,short/scale*5)*scale*(scan?3:2))),gap=1;
  for(let i=0;i<dark.length;i++){const j=i*4;dark[i]=data[j+3]>100&&Math.max(data[j],data[j+1],data[j+2])<150?1:0;}
  for(let y=0;y<h;y++){
   for(let x=0;x<w;x++){
    if(!dark[y*w+x])continue;
    const start=x;let last=x,miss=0;
    while(++x<w){if(dark[y*w+x]){last=x;miss=0;}else if(++miss>gap)break;}
    const length=last-start+1;if(length<min||length>max)continue;
    const key=Math.round(start/3)+':'+Math.round(last/3),old=active.get(key);
    if(old&&old.bottom===y-1){old.bottom=y;old.left=Math.min(old.left,start);old.right=Math.max(old.right,last);}
    else{const line={left:start,right:last,top:y,bottom:y};lines.push(line);active.set(key,line);}
   }
  }
  // Rendered bitmap borders can differ by a source pixel at opposite corners.
  // Keep that tolerance in drawing units when the scan is rendered larger.
  const tolerance=Math.max(3,Math.ceil(scale*2)),bucketSize=tolerance+1,sideTolerance=Math.max(2,Math.ceil(scale));
  const buckets=new Map();for(const line of lines){const key=Math.floor(line.left/bucketSize);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(line);}
  const side=(x,y1,y2)=>{let covered=0;for(let y=y1;y<=y2;y++){for(let dx=-sideTolerance;dx<=sideTolerance;dx++)if(x+dx>=0&&x+dx<w&&dark[y*w+x+dx]){covered++;break;}}return covered/Math.max(1,y2-y1+1);};
  const found=[];
  for(const a of lines){
   if(a.bottom-a.top>short*.3)continue;
   const bucket=Math.floor(a.left/bucketSize);
   for(let key=bucket-1;key<=bucket+1;key++)for(const b of buckets.get(key)||[]){
    if(b.top-a.bottom<min||b.top-a.bottom>max||Math.abs(a.left-b.left)>tolerance||Math.abs(a.right-b.right)>tolerance)continue;
    const box={left:Math.round((a.left+b.left)/2),right:Math.round((a.right+b.right)/2),top:a.top,bottom:b.bottom};
    if(!similarFrame(box,profile,scale,scan)||side(box.left,a.bottom,b.top)<.83||side(box.right,a.bottom,b.top)<.83)continue;
    if(found.some(f=>overlap(f,box)>.85))continue;found.push(box);
   }
  }
  return found;
 }
 async function scanPage(pdfPage,pdfjs){const viewport=pdfPage.getViewport({scale:1});const [ops,text]=await Promise.all([pdfPage.getOperatorList(),pdfPage.getTextContent()]);const frames=framesFromOperators(ops,pdfjs.OPS,viewport);return{hits:matchNumbers(frames,text,viewport,pdfPage.pageNumber),hasText:text.items.some(t=>t.str?.trim()),frameCount:frames.length};}
 // Resize in visible drawing axes; store dimensions in the original PDF viewport.
 function boxScale(box,axis,rotation=0){const swapped=Math.abs(rotation%180)===90,key=(axis==='width')!==swapped?'width':'height',base=key==='width'?'baseWidth':'baseHeight';return Math.round(box[key]/(box[base]||box[key])*100);}
 function resizeBox(box,axis,percent,rotation=0){
  if(!['width','height'].includes(axis)||!Number.isFinite(percent)||!Number.isFinite(box.width)||!Number.isFinite(box.height))return{...box};
  const out={...box,baseWidth:box.baseWidth||box.width,baseHeight:box.baseHeight||box.height,baseTextHeight:box.baseTextHeight||box.textHeight};
  const swapped=Math.abs(rotation%180)===90,key=(axis==='width')!==swapped?'width':'height',base=key==='width'?'baseWidth':'baseHeight';
  out[key]=Math.min(1,out[base]*Math.max(25,Math.min(600,percent))/100);
  const vertical=Math.abs(Math.sin((box.angle||0)*Math.PI/180))>.707;
  out.textHeight=out.baseTextHeight*(vertical?out.width/out.baseWidth:out.height/out.baseHeight);
  return out;
 }
 function fitLabelSize(box,width,height,unitTextWidth){
  const a=(box.angle||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),w=box.width*width*.88,h=box.height*height*.82;
  return Math.max(.01,Math.min(box.textHeight*height*.9,w/Math.max(.01,c*unitTextWidth+s),h/Math.max(.01,s*unitTextWidth+c)));
 }
 function samePosition(item,hit){if(item.page!==hit.page)return false;const box=item.detectorBox;const dx=Math.abs(item.x-hit.x),dy=Math.abs(item.y-hit.y);return dx<Math.max(.0008,(box?.baseWidth||box?.width||hit.width)*.3)&&dy<Math.max(.0008,(box?.baseHeight||box?.height||hit.height)*.3);}
 function nearestExisting(items,hit,used=new Set()){
  const placed=items.find(o=>o.type==='detector'&&!used.has(o.uid)&&samePosition(o,hit));if(placed)return placed;
  // Older arrow points sit near their number. Only reuse a nearby, same-code object.
  return items.filter(o=>o.type==='detector'&&!o.detectorBox&&!used.has(o.uid)&&o.page===hit.page&&String(o.id).trim()===hit.code&&Math.hypot((o.x-hit.x)/hit.width,(o.y-hit.y)/hit.height)<5).sort((a,b)=>Math.hypot(a.x-hit.x,a.y-hit.y)-Math.hypot(b.x-hit.x,b.y-hit.y))[0]||null;
 }
 return{boxScale,resizeBox,fitLabelSize,framesFromOperators,framesFromPixels,hasFrameInk,inkBounds,validProfile,similarFrame,filterByProfile,confirmedSampleHit,consensusNumber,textGeometry,matchNumbers,scanPage,samePosition,nearestExisting};
});
