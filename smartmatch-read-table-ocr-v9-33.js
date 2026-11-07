/* Read confirmed ruled tables cell by cell. All returned boxes stay in the
 * original crop's coordinates. Never strip digits from recognised strings. */
(function(root){
 'use strict';
 function prepare(canvas){
  const ctx=canvas.getContext('2d'),image=ctx.getImageData(0,0,canvas.width,canvas.height),p=image.data,w=canvas.width,h=canvas.height;
  const xs=new Uint32Array(w),ys=new Uint32Array(h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(p[i]+p[i+1]+p[i+2]<570){xs[x]++;ys[y]++;}}
  function bands(counts,length){
   const result=[];let start=-1;
   for(let i=0;i<=counts.length;i++){
    if(i<counts.length&&counts[i]>=length*.65){if(start<0)start=i;}
    else if(start>=0){if(i-start<=Math.max(8,length*.015))result.push({start,end:i});start=-1;}
   }
   return result;
  }
  const vertical=bands(xs,h),horizontal=bands(ys,w);
  // A single letter, underline, or paragraph is insufficient evidence of a grid.
  if(vertical.length<3||horizontal.length<3)return null;
  const edges=(bands,length)=>[{start:0,end:0},...bands,{start:length,end:length}];
  const rows=edges(horizontal,h),cells=[];
  for(let r=0;r<rows.length-1;r++){
   const y=rows[r].end,ch=rows[r+1].start-y;if(ch<7)continue;
   // Merged headings/cells have no vertical separator in this row.
   const columns=edges(vertical.filter(line=>{
    let hits=0;for(let yy=y;yy<y+ch;yy++){
     let dark=false;for(let xx=line.start;xx<line.end;xx++){const i=(yy*w+xx)*4;if(p[i]+p[i+1]+p[i+2]<570)dark=true;}
     if(dark)hits++;
    }
    return hits>=ch*.5;
   }),w);
   for(let c=0;c<columns.length-1;c++){
   const x=columns[c].end,cw=columns[c+1].start-x;
   if(cw<12||ch<7)continue;
   let ink=0;
   for(let yy=y;yy<y+ch;yy++)for(let xx=x;xx<x+cw;xx++){const i=(yy*w+xx)*4;if(p[i]+p[i+1]+p[i+2]<570)ink++;}
   if(ink>=3)cells.push({x,y,w:cw,h:ch});
   }
  }
  // Remove the full established rule band, including breaks. No expansion into
  // adjacent glyphs: digits touching the rule need to retain their own pixels.
  for(const cell of cells){for(const x of [cell.x-1,cell.x+cell.w]){const line=vertical.find(l=>x>=l.start&&x<l.end);if(!line)continue;for(let y=cell.y;y<cell.y+cell.h;y++)for(let xx=line.start;xx<line.end;xx++){const i=(y*w+xx)*4;p[i]=p[i+1]=p[i+2]=255;}}}
  for(const line of horizontal)for(let y=line.start;y<line.end;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;p[i]=p[i+1]=p[i+2]=255;}
  ctx.putImageData(image,0,0);return {cells,vertical,horizontal};
 }
 async function read(canvas,grid,worker,{recognize,check=()=>{},progress=()=>{}}){
  const words=[],scores=[];let done=0;
  await worker.setParameters({tessedit_pageseg_mode:6,preserve_interword_spaces:'1'});
  for(const cell of grid.cells){
   check();const scale=Math.max(1,Math.min(3,56/cell.h,1600/cell.w)),pad=12,tile=document.createElement('canvas');
   tile.width=Math.ceil(cell.w*scale)+pad*2;tile.height=Math.ceil(cell.h*scale)+pad*2;
   const ctx=tile.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,tile.width,tile.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.drawImage(canvas,cell.x,cell.y,cell.w,cell.h,pad,pad,cell.w*scale,cell.h*scale);
   try{
    const {data}=await recognize(worker,tile);check();scores.push(Number(data.confidence)||0);
    for(const word of data.words||[]){
     const b=word.bbox,cx=((b.x0+b.x1)/2-pad)/scale,cy=((b.y0+b.y1)/2-pad)/scale;
     if(cx<0||cy<0||cx>cell.w||cy>cell.h)continue;
     words.push({...word,bbox:{x0:cell.x+Math.max(0,(b.x0-pad)/scale),x1:cell.x+Math.min(cell.w,(b.x1-pad)/scale),y0:cell.y+Math.max(0,(b.y0-pad)/scale),y1:cell.y+Math.min(cell.h,(b.y1-pad)/scale)}});
    }
   }finally{tile.width=tile.height=1;}
   progress(++done,grid.cells.length);
  }
  return {words,confidence:scores.reduce((a,b)=>a+b,0)/Math.max(1,scores.length),text:''};
 }
 root.SmartMatchReadTableOCR={prepare,read};
})(typeof window!=='undefined'?window:globalThis);
