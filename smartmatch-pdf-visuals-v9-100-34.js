/* Static drawing marks. Editable project data stays in the existing project payload. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SmartMatchPdfVisuals=api})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const KEY='SmartMatch134VisualStreams';
 const exportNotes=notes=>(notes||[]).filter(n=>!(n.type==='image'&&n.name==='SmartMatch färgförklaring'));
 const validRect=r=>Array.isArray(r)&&r.length===4&&r.every(Number.isFinite)&&r[2]>r[0]&&r[3]>r[1];
 const middle=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
 function edge(r,toward,stored){
  if(Number.isFinite(stored?.u)&&Number.isFinite(stored?.v))return {x:r.left+r.width*Math.max(0,Math.min(1,stored.u)),y:r.top+r.height*Math.max(0,Math.min(1,stored.v))};
  const c=middle(r),dx=toward.x-c.x,dy=toward.y-c.y;
  const k=Math.min(dx?r.width/2/Math.abs(dx):Infinity,dy?r.height/2/Math.abs(dy):Infinity);
  return Number.isFinite(k)?{x:c.x+dx*k,y:c.y+dy*k}:c;
 }
 function arrows(items,resolve){
  const result=[];
  for(const item of items||[]){
   if(item.gsLinkDismissed||!validRect(item.rect))continue;
   const gs=resolve?resolve(item):{page:item.page,rect:item.linkedGsRect};
   if(!gs||gs.page!==item.page||!validRect(gs.rect))continue;
   const value={...item,linkedGsRect:gs.rect.slice()};
   // Historic duplicate records retain their checks, but share one physical arrow.
   const key=o=>[o.objectNo||'',o.modelCode||'',o.serialNumber||''].join('-');
   const index=result.findIndex(o=>{
    if(o.page!==item.page||key(o)!==key(item))return false;
    const a=o.rect,b=item.rect,overlap=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
    return overlap/Math.min((a[2]-a[0])*(a[3]-a[1]),(b[2]-b[0])*(b[3]-b[1]))>=.45;
   });
   if(index<0)result.push(value);else if(item.gsLinkConfirmed&&!result[index].gsLinkConfirmed)result[index]=value;
  }
  return result;
 }
 function remove(doc,lib){
  const {PDFName:N,PDFArray:A,PDFDict:D}=lib,ctx=doc.context,index=doc.catalog.lookupMaybe(N.of(KEY),A);
  if(!index)return 0;const pages=new Map(doc.getPages().map(p=>[String(p.ref),p]));let removed=0;
  for(const raw of index.asArray()){
   const entry=ctx.lookup(raw,A),page=pages.get(String(entry.get(0)));if(!page)continue;
   const contents=page.node.normalizedEntries().Contents,kept=contents.asArray().filter(ref=>String(ref)!==String(entry.get(1)));
   if(kept.length!==contents.size()){page.node.set(N.of('Contents'),ctx.obj(kept));removed++;}
   const objects=page.node.normalizedEntries().Resources.lookupMaybe(N.of('XObject'),D);
   if(objects&&entry.size()>2)for(const key of ctx.lookup(entry.get(2),A).asArray())if(key.toString().startsWith('/SMStaticLabel-'))objects.delete(key);
  }
  doc.catalog.set(N.of(KEY),ctx.obj([]));return removed;
 }
 async function flatten(doc,payload,lib,geometry,report=async()=>{},resolve){
  remove(doc,lib);const ctx=doc.context,index=[],cache=new Map(),pages=doc.getPages();
  const number=n=>{if(!Number.isFinite(n))throw Error('Ogiltig placering för PDF-stämpel.');return Number(n.toFixed(5));};
  const labels=payload.textChecks||[],links=arrows(payload.automationItems,resolve);
  const add=(page,commands,images=[])=>{const ref=ctx.register(ctx.flateStream(commands.join('\n')+'\n',{}));page.node.addContentStream(ref);index.push(ctx.obj([page.ref,ref,ctx.obj(images)]));};
  for(const [i,item] of labels.entries()){
   await report(50,'Sparar textstämplar',(i+1)+' av '+labels.length);
   const page=pages[item.page-1];if(!page||!validRect(item.rect)||!item.name)throw Error('Textstämpelns sida, text eller placering saknas.');
   const g=geometry(page),box=g.rectToDisplay(item.rect),w=box.width,h=box.height;
   const color=/^#[0-9a-f]{6}$/i.test(item.color||'')?item.color:'#74d8d0',key=JSON.stringify([item.name,color,w,h]);let embedded=cache.get(key);
   if(!embedded){
    // Rasterize only the small label for Unicode/system-ui; source drawings remain vectors.
    const canvas=document.createElement('canvas'),density=Math.min(3,2048/w,2048/h,Math.sqrt(1000000/(w*h)));let data;
    try{
     canvas.width=Math.max(1,Math.ceil(w*density));canvas.height=Math.max(1,Math.ceil(h*density));
     const c=canvas.getContext('2d');c.scale(density,density);c.fillStyle=color;c.fillRect(0,0,w,h);c.strokeStyle='#315b65';c.lineWidth=Math.min(1,h*.05);c.strokeRect(.5,.5,Math.max(0,w-1),Math.max(0,h-1));
     c.font='600 100px system-ui';const size=Math.max(.1,Math.min(h*.65,Math.max(.1,w-h*.35)*100/Math.max(1,c.measureText(item.name).width)));
     const channels=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
     c.fillStyle=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722>.179?'#000':'#fff';c.font='600 '+size+'px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(item.name,w/2,h/2);
     data=typeof canvas.toBlob==='function'?await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(Error('Textstämpeln kunde inte skapas.')),'image/png')):canvas.toDataURL('image/png');
    }finally{canvas.width=canvas.height=1;}
    embedded=await doc.embedPng(typeof data==='string'?data:new Uint8Array(await data.arrayBuffer()));cache.set(key,embedded);
   }
   const image=page.node.newXObject('SMStaticLabel',embedded.ref),origin=g.toPdf(box.left,box.bottom),a=g.turn*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
   add(page,['q',[c*w,s*w,-s*h,c*h,origin.x,origin.y].map(number).join(' ')+' cm',image.toString()+' Do','Q'],[image]);
  }
  for(const item of links){
   const page=pages[item.page-1];if(!page)throw Error('Automatikpilens PDF-sida saknas.');
   const g=geometry(page),da=g.rectToDisplay(item.rect),gs=g.rectToDisplay(item.linkedGsRect);
   // Keep the selected GS attachment point; the arrowhead points at the automation.
   const start=edge(gs,middle(da),item.arrowTip),tip=edge(da,start,item.daArrowTip),dx=tip.x-start.x,dy=tip.y-start.y,length=Math.hypot(dx,dy);
   const commands=['q','0.09 0.435 0.608 RG','0.09 0.435 0.608 rg','1.2 w','1 J','1 j'];
   if(length>.01){const ux=dx/length,uy=dy/length,size=Math.min(7,length*.4),left={x:tip.x-size*ux-size*.45*uy,y:tip.y-size*uy+size*.45*ux},right={x:tip.x-size*ux+size*.45*uy,y:tip.y-size*uy-size*.45*ux};
    const point=p=>{const v=g.toPdf(p.x,p.y);return number(v.x)+' '+number(v.y);};commands.push(point(start)+' m '+point(tip)+' l S',point(tip)+' m '+point(left)+' l '+point(right)+' l h f');}
   commands.push('Q');add(page,commands);
  }
  doc.catalog.set(lib.PDFName.of(KEY),ctx.obj(index));return {labels:labels.length,arrows:links.length};
 }
 function verify(doc,payload,lib,resolve){
  const {PDFName:N,PDFArray:A}=lib,index=doc.catalog.lookupMaybe(N.of(KEY),A),expected=(payload.textChecks||[]).length+arrows(payload.automationItems,resolve).length;
  if(!index||index.size()!==expected)throw Error('Alla textstämplar och automatikpilar följer inte med i PDF-filen.');
  const pages=new Map(doc.getPages().map(p=>[String(p.ref),p]));
  for(const raw of index.asArray()){const e=doc.context.lookup(raw,A),page=pages.get(String(e.get(0)));if(!page?.node.normalizedEntries().Contents.asArray().some(ref=>String(ref)===String(e.get(1))))throw Error('En textstämpel eller automatikpil saknas på PDF-sidan.');}
 }
 return {exportNotes,arrows,edge,remove,flatten,verify};
});
