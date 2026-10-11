/* SmartMatch TEST v36.78 – contour of existing PDF stamps, UI only. */
(()=>{
'use strict';
const cache=new Map();
function classifyFromMetadata(mark){
 if(mark?.subtype==='Circle')return 'ellipse';
 if(mark?.subtype==='Square')return 'rectangle';
 return '';
}
function classifyPixels(image){
 if(!image?.data||image.width<16||image.height<13)return '';
 const {data,width:w,height:h}=image,step=Math.max(1,Math.floor(Math.max(w,h)/130));
 let inkCorner=0,cornerCount=0,inkEdge=0,edgeCount=0;
 for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){
  const u=(x+.5)/w,v=(y+.5)/h;
  const corner=(u<.23||u>.77)&&(v<.23||v>.77);
  const side=((v<.18||v>.82)&&u>.30&&u<.70)||((u<.18||u>.82)&&v>.30&&v<.70);
  if(!corner&&!side)continue;
  const k=(y*w+x)*4,R=data[k],G=data[k+1],B=data[k+2],A=data[k+3];
  const hi=Math.max(R,G,B),lo=Math.min(R,G,B);
  const ink=A>=160&&(lo<195||(hi-lo>28&&hi<255)||(hi-lo>35));
  if(corner){cornerCount++;if(ink)inkCorner++}
  else{edgeCount++;if(ink)inkEdge++}
 }
 const corner=inkCorner/Math.max(1,cornerCount),edge=inkEdge/Math.max(1,edgeCount);
 if(cornerCount<12||edgeCount<12||edge<.10)return '';
 // A thin elliptical outline has some diagonal ink but substantially less
 // than the middle of its four sides. A square outline keeps strong corners.
 if(corner<edge*.68&&corner<.28)return 'ellipse';
 if(corner>edge*.78)return 'rectangle';
 return '';
}
function inferUncached(item,canvas,viewport,raster){
 const known=classifyFromMetadata(item);
 if(known)return {shape:known,source:'PDF annotation'};
 const rect=item?.hitVisualRect||item?.rect;
 if(!Array.isArray(rect)||rect.length!==4||!canvas||!viewport||!raster||raster.page!==item.page)return {shape:'rounded',source:'fallback'};
 const source=String(item.scanSource||'');
 if(!(source.startsWith('annotation')||source==='color-first-pdf'||item.subtype==='Stamp'||item.subtype==='FreeText'))return {shape:'rounded',source:'fallback'};
 const a=viewport.convertToViewportPoint(rect[0],rect[1]),b=viewport.convertToViewportPoint(rect[2],rect[3]);
 const mx=canvas.width/Math.max(1,viewport.width),my=canvas.height/Math.max(1,viewport.height);
 const x=Math.max(0,Math.floor(Math.min(a[0],b[0])*mx)),y=Math.max(0,Math.floor(Math.min(a[1],b[1])*my));
 const right=Math.min(canvas.width,Math.ceil(Math.max(a[0],b[0])*mx)),bottom=Math.min(canvas.height,Math.ceil(Math.max(a[1],b[1])*my));
 const w=right-x,h=bottom-y;
 if(w<16||h<13||w>420||h>270)return {shape:'rounded',source:'fallback'};
 try{
  const image=canvas.getContext('2d')?.getImageData(x,y,w,h);
  const shape=classifyPixels(image);
  return {shape:shape||'rounded',source:shape?'rendered contour':'fallback'};
 }catch(_){return {shape:'rounded',source:'fallback'}}
}
function infer(item,canvas,viewport,raster){
 const rect=item?.hitVisualRect||item?.rect||[],key=[raster?.page,canvas?.width,canvas?.height,item?.id,rect.join(',')].join('|');
 if(cache.has(key))return cache.get(key);
 const result=inferUncached(item,canvas,viewport,raster);
 if(cache.size>1400)cache.clear();
 cache.set(key,result);
 return result;
}
window.SmartMatchStampShapes={infer,clear:()=>cache.clear(),classifyPixels,classifyFromMetadata};
})();