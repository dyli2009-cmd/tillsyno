/* Native PDF text fragments, TEST 9.6. Font fallback can split one word at
 * å/ä/ö. Rejoin touching text on its original baseline, without a dictionary,
 * guessed spelling, accent removal or changes to the PDF itself. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SmartMatchReadText=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 function geometry(item){
  const t=item?.transform;
  if(!Array.isArray(t)||t.length!==6||!t.every(Number.isFinite)||item.dir==='rtl'||item.dir==='ttb')return null;
  const scale=Math.hypot(t[0],t[1]),height=Number(item.height)||Math.hypot(t[2],t[3]);
  if(!scale||!height||!Number.isFinite(item.width)||item.width<0)return null;
  return {x:t[4],y:t[5],ux:t[0]/scale,uy:t[1]/scale,h:height,w:item.width};
 }
 function touching(left,right){
  if(left.hasEOL||/\s$/u.test(left.str)||/^\s/u.test(right.str))return false;
  const a=geometry(left),b=geometry(right);if(!a||!b)return false;
  if(a.ux*b.ux+a.uy*b.uy<.9999||Math.abs(a.h-b.h)>Math.min(a.h,b.h)*.15)return false;
  const dx=b.x-a.x,dy=b.y-a.y,h=Math.min(a.h,b.h);
  const along=dx*a.ux+dy*a.uy,gap=along-a.w,baseline=Math.abs(dx*a.uy-dy*a.ux);
  return along>0&&baseline<=h*.035&&gap>=-h*.035&&gap<=h*.03;
 }
 function joinNativeContent(content){
  if(!Array.isArray(content?.items))return content;
  const items=[];
  for(const item of content.items){
   const previous=items.at(-1);
   if(item?.str&&previous?.str&&touching(previous,item)){
    const a=geometry(previous),b=geometry(item);
    const along=(b.x-a.x)*a.ux+(b.y-a.y)*a.uy;
    items[items.length-1]={...previous,str:(previous.str+item.str).normalize('NFC'),width:along+b.w,height:Math.max(a.h,b.h),hasEOL:!!item.hasEOL};
   }else items.push(item);
  }
  return {...content,items};
 }
 return Object.freeze({joinNativeContent});
});
