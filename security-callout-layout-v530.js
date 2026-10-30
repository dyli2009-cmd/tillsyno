/* Geometry shared by newly created Security Service text labels and their PDF export. */
window.SecurityCalloutLayout=(()=>{
 'use strict';
 const style='security-callout-v1';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function layout(item,width,height,fontSize,measure){
  const margin=4*fontSize/13,pad=6*fontSize/13,lineHeight=fontSize*1.3;
  const maxWidth=Math.max(pad*2+fontSize,Math.min(240*fontSize/13,width-margin*2));
  const limit=maxWidth-pad*2,lines=[];
  let line='';
  for(const word of String(item.text||'').trim().split(/\s+/)){
   const candidate=line?line+' '+word:word;
   if(measure(candidate)<=limit){line=candidate;continue}
   if(line){lines.push(line);line=''}
   for(const char of word){if(line&&measure(line+char)>limit){lines.push(line);line=''}line+=char;}
  }
  if(line||!lines.length)lines.push(line);
  const boxW=Math.min(maxWidth,Math.max(28*fontSize/13,...lines.map(measure))+pad*2);
  const boxH=lines.length*lineHeight+pad*2;
  let x=clamp((Number(item.x)||0)*width-pad,margin,Math.max(margin,width-margin-boxW));
  let y=clamp((Number(item.y)||0)*height-fontSize-pad,margin,Math.max(margin,height-margin-boxH));
  const target={x:Number(item.targetX)*width,y:Number(item.targetY)*height},gap=14*fontSize/13;
  if(item.type==='text-arrow'&&Number.isFinite(target.x)&&Number.isFinite(target.y)&&target.x>=x-gap&&target.x<=x+boxW+gap&&target.y>=y-gap&&target.y<=y+boxH+gap){
   const candidates=[{x:target.x+gap,y},{x:target.x-gap-boxW,y},{x,y:target.y-gap-boxH},{x,y:target.y+gap}].filter(p=>p.x>=margin&&p.x+boxW<=width-margin&&p.y>=margin&&p.y+boxH<=height-margin);
   candidates.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
   if(candidates.length){x=candidates[0].x;y=candidates[0].y;}
  }
  return {x,y,w:boxW,h:boxH,lines,fontSize,lineHeight,pad,label:{x:x+pad,y:y+pad+fontSize}};
 }
 function leader(box,target){
  if(!Number.isFinite(target.x)||!Number.isFinite(target.y))return null;
  if(target.x>=box.x&&target.x<=box.x+box.w&&target.y>=box.y&&target.y<=box.y+box.h)return null;
  const cx=box.x+box.w/2,cy=box.y+box.h/2,dx=target.x-cx,dy=target.y-cy;
  const t=Math.min(dx?box.w/(2*Math.abs(dx)):Infinity,dy?box.h/(2*Math.abs(dy)):Infinity);
  return Number.isFinite(t)?{x:cx+dx*t,y:cy+dy*t}:null;
 }
 return {style,layout,leader};
})();
