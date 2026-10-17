/* Project-specific coloured stamp appearance, isolated Avläsning TEST 9.8. */
(()=>{
 'use strict';
 const hueDistance=(a,b)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
 function hue(r,g,b){const hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;if(!d)return 0;let h=hi===r?60*((g-b)/d%6):hi===g?60*((b-r)/d+2):60*((r-g)/d+4);return h<0?h+360:h;}
 function coloured(r,g,b){const hi=Math.max(r,g,b),lo=Math.min(r,g,b);return hi-lo>=40&&(hi-lo)/Math.max(1,hi)>=.22&&hi>=85;}
 const unknown=reason=>({version:1,kind:'unknown',reason});
 function profile(image){
  const {data,width,height}=image||{};if(!data||width<4||height<4)return unknown('Markeringen är för liten.');
  const bins=Array(36).fill(0);let total=0;
  for(let i=0;i<data.length;i+=4){if(data[i+3]<80||!coloured(data[i],data[i+1],data[i+2]))continue;bins[Math.floor(hue(data[i],data[i+1],data[i+2])/10)%36]++;total++;}
  if(total<24||total/(width*height)<.025)return unknown('Ingen tydlig färgad stämpelbakgrund i markeringen.');
  let peak=0,count=0;for(let i=0;i<36;i++){let n=0;for(let j=0;j<36;j++)if(hueDistance(i*10+5,j*10+5)<=25)n+=bins[j];if(n>count){peak=i*10+5;count=n;}}
  if(count/total<.65)return unknown('Markeringen innehåller flera olika färgade ytor. Markera en enda stämpel.');
  const mask=new Uint8Array(width*height);for(let p=0;p<mask.length;p++){const i=p*4;if(data[i+3]>=80&&coloured(data[i],data[i+1],data[i+2])&&hueDistance(hue(data[i],data[i+1],data[i+2]),peak)<=28)mask[p]=1;}
  // The largest connected coloured area is the stamp background. Text holes
  // and nearby isolated coloured drawing lines cannot define its silhouette.
  let best=[];const queue=new Int32Array(mask.length);
  for(let p=0;p<mask.length;p++){if(mask[p]!==1)continue;let head=0,tail=1;queue[0]=p;mask[p]=2;while(head<tail){const q=queue[head++],x=q%width;for(const n of [x?q-1:-1,x+1<width?q+1:-1,q-width,q+width])if(n>=0&&n<mask.length&&mask[n]===1){mask[n]=2;queue[tail++]=n;}}if(tail>best.length)best=Array.from(queue.subarray(0,tail));}
  if(best.length<24||best.length/(width*height)<.025)return unknown('Ingen sammanhängande färgad stämpelbakgrund kunde bestämmas.');
  let x0=width,y0=height,x1=0,y1=0,r=0,g=0,b=0;for(const p of best){const x=p%width,y=Math.floor(p/width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);r+=data[p*4];g+=data[p*4+1];b+=data[p*4+2];}
  const w=x1-x0+1,h=y1-y0+1,grid=Array(16).fill(0),areas=Array(16).fill(0);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)areas[Math.min(3,Math.floor(y/h*4))*4+Math.min(3,Math.floor(x/w*4))]++;
  for(const p of best){const x=p%width-x0,y=Math.floor(p/width)-y0;grid[Math.min(3,Math.floor(y/h*4))*4+Math.min(3,Math.floor(x/w*4))]++;}
  const occupancy=grid.map((n,i)=>n/Math.max(1,areas[i])),fill=best.length/(w*h),corners=(occupancy[0]+occupancy[3]+occupancy[12]+occupancy[15])/4;
  const rgb=[r,g,b].map(v=>Math.round(v/best.length)),value=hue(...rgb),round=fill>.42&&fill<.9&&corners<.69;
  const colour=value<20||value>=340?'röd':value<52?'orange':value<85?'gul':value<165?'grön':value<205?'turkos':value<265?'blå':'lila';
  return {version:1,kind:'background',hue:value,rgb,fill,corners,aspect:w/h,occupancy,round,bounds:{x:x0/width,y:y0/height,w:w/width,h:h/height},label:colour+' bakgrund · '+(round?'rund/oval form':'markerad form')};
 }
 function compare(reference,candidate){
  if(!validProfile(reference)||!validProfile(candidate))return {matches:false,reason:'oklar stämpelbakgrund'};
  if(hueDistance(reference.hue,candidate.hue)>25)return {matches:false,reason:'annan bakgrundsfärg'};
  const shapeDifference=reference.occupancy.reduce((sum,n,i)=>sum+Math.abs(n-candidate.occupancy[i]),0)/16;
  if(reference.round&&!candidate.round||Math.abs(reference.fill-candidate.fill)>.23||shapeDifference>.24||Math.abs(Math.log(reference.aspect/candidate.aspect))>.5)return {matches:false,reason:'annan stämpelform'};
  return {matches:true,reason:'samma stämpelutseende'};
 }
 function validProfile(value){return value?.kind==='background'&&Number.isFinite(value.hue)&&Number.isFinite(value.fill)&&Number.isFinite(value.aspect)&&value.aspect>0&&Array.isArray(value.occupancy)&&value.occupancy.length===16&&value.occupancy.every(n=>Number.isFinite(n)&&n>=0&&n<=1);}
 function valid(value){return value?.version===1&&validProfile(value.profile)&&[value.referenceSize?.width,value.referenceSize?.height,value.relativeText?.w,value.relativeText?.h,value.sampleRect?.w,value.sampleRect?.h].every(n=>Number.isFinite(n)&&n>0)&&[value.relativeText.x,value.relativeText.y,value.sampleRect.x,value.sampleRect.y].every(Number.isFinite);}
 function learn(profileValue,rect,textBox,viewport){
  if(profileValue?.kind!=='background'||!textBox?.h||!viewport)return null;
  return {version:1,enabled:true,profile:profileValue,referenceSize:{width:viewport.width,height:viewport.height},relativeText:{x:(textBox.x-rect.x)/rect.w,y:(textBox.y-rect.y)/rect.h,w:textBox.w/rect.w,h:textBox.h/rect.h},sampleRect:{...rect}};
 }
 function regionForHit(sample,box,vp){
  const a=sample?.appearance||sample,r=a?.relativeText,s=a?.sampleRect,sz=a?.referenceSize;
  if(!valid(a)||!box?.h||!vp)return box;
  // Stamp size follows the text height, not its character count: WC and a
  // longer DBL code can share one round stamp without stretching its shape.
  const scale=box.h*vp.height/Math.max(.001,s.h*sz.height*r.h),w=s.w*sz.width*scale/vp.width,h=s.h*sz.height*scale/vp.height;
  const cx=box.x+box.w/2,cy=box.y+box.h/2,x=cx-w*(r.x+r.w/2),y=cy-h*(r.y+r.h/2),pad=.08;
  const x0=Math.max(0,x-w*pad),y0=Math.max(0,y-h*pad),x1=Math.min(1,x+w*(1+pad)),y1=Math.min(1,y+h*(1+pad));
  return {x:x0,y:y0,w:Math.max(.000001,x1-x0),h:Math.max(.000001,y1-y0)};
 }
 function textPlacementMatches(sample,candidate,region,textBox){
  const a=sample.appearance,r=a.relativeText,b=a.profile.bounds,c=candidate.bounds;if(!b||!c)return false;
  const expectedX=(r.x+r.w/2-b.x)/b.w,expectedY=(r.y+r.h/2-b.y)/b.h,x=((textBox.x+textBox.w/2-region.x)/region.w-c.x)/c.w,y=((textBox.y+textBox.h/2-region.y)/region.h-c.y)/c.h;
  return x>=0&&x<=1&&y>=0&&y<=1&&Math.abs(expectedX-x)<.22&&Math.abs(expectedY-y)<.22;
 }
 async function renderProfile(pg,rect,{cancelled=()=>false,onRenderTask=()=>{}}={}){
  if(cancelled())throw Error('Sökningen avbröts.');const vp1=pg.getViewport({scale:1}),scale=Math.min(6,2048/Math.max(1,rect.w*vp1.width),2048/Math.max(1,rect.h*vp1.height),Math.sqrt(160000/Math.max(1,rect.w*vp1.width*rect.h*vp1.height))),vp=pg.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(rect.w*vp.width));canvas.height=Math.max(1,Math.ceil(rect.h*vp.height));const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  const task=pg.render({canvasContext:ctx,viewport:vp,transform:[1,0,0,1,-rect.x*vp.width,-rect.y*vp.height]});onRenderTask(task);
  try{await task.promise;if(cancelled())throw Error('Sökningen avbröts.');return profile(ctx.getImageData(0,0,canvas.width,canvas.height));}finally{canvas.width=canvas.height=1;onRenderTask(null);}
 }
 async function filterHits({pdf,hits,sample,getWords,onDetail=()=>{},cancelled=()=>false,onRenderTask=()=>{}}){
  if(!sample?.appearance?.enabled)return {hits,excluded:0,unknown:0};
  if(!valid(sample.appearance))throw Error('Det sparade stämpelexemplet är ogiltigt. Markera en ny exempelstämpel.');
  const kept=[];let excluded=0,unknownCount=0;const pages=new Map();
  for(let i=0;i<hits.length;i++){
   if(cancelled())throw Error('Sökningen avbröts.');const hit=hits[i];onDetail({phase:'stamp-appearance',label:'Kontrollerar stämpelns bakgrund och form',page:hit.page,unit:'candidate',done:i,total:hits.length,scope:'stamp-appearance'});
   if(!pages.has(hit.page))pages.set(hit.page,await pdf.getPage(hit.page));const pg=pages.get(hit.page),vp=pg.getViewport({scale:1});let textBox=hit.box;
   if(getWords){const words=await getWords(pg,hit.page),inside=words.filter(w=>w.x+w.w/2>=hit.box.x&&w.x+w.w/2<=hit.box.x+hit.box.w&&w.y+w.h/2>=hit.box.y&&w.y+w.h/2<=hit.box.y+hit.box.h);const exact=window.SmartMatchReadMatcher?.textHits(inside,[hit.code]);if(exact?.length)textBox=exact[0].box;}
   const region=regionForHit(sample,textBox,vp),candidate=await renderProfile(pg,region,{cancelled,onRenderTask}),decision=compare(sample.appearance.profile,candidate);
   if(decision.matches&&textPlacementMatches(sample,candidate,region,textBox))kept.push({...hit,appearance:candidate});else if(candidate.kind==='unknown')unknownCount++;else excluded++;
   onDetail({done:i+1,total:hits.length});await new Promise(resolve=>setTimeout(resolve,0));
  }
  return {hits:kept,excluded,unknown:unknownCount};
 }
 window.SmartMatchReadAppearanceV98=Object.freeze({profile,compare,learn,regionForHit,renderProfile,filterHits,hueDistance,valid});
})();
