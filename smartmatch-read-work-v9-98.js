/* Additional verified layout for Avläsning 9.98. The 9.32 reader stays intact.
 * Blank component/product headings are accepted only with a complete aligned
 * responsibility matrix, repeated body-column evidence and section anchors.
 */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./smartmatch-read-work-v9-32.js'));
 else root.SmartMatchReadWork=factory(root.SmartMatchReadWork);
})(typeof window!=='undefined'?window:globalThis,function(legacy){
 'use strict';
 if(!legacy||typeof legacy.read!=='function')throw Error('Den befintliga tabelläsaren saknas.');
 const profileId='responsibility-matrix-unheaded-products-v1';
 const clean=value=>String(value??'').normalize('NFC').replace(/\s+/g,' ').trim();
 const key=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv').replace(/[^a-z0-9]/g,'');
 const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
 const empty=value=>!clean(value)||/^(?:[-–—―_.|\s]+|ej\s+aktuellt|ingår\s+ej|ej\s+bestämt|saknas|n\/a)$/i.test(clean(value));
 const sections=new Set(['daglasning','daglas','nattlasning','nattlas','dorrstangning','ovrigutrustning','larmpasser','larmochpasser','larmpassage']);
 const roleKeys=[['levav','levererasav'],['montav','monterasav'],['anslav','anslutsav'],['funkansvar','funktionsansvar'],['anm','anmarkning']];
 function wordsFrom(input){
  return (Array.isArray(input)?input:[]).map(word=>({...word,text:clean(word.text??word.str),x:Number(word.x),y:Number(word.y),w:Number(word.w??word.width),h:Number(word.h??word.height)}))
   .filter(word=>word.text&&[word.x,word.y,word.w,word.h].every(Number.isFinite)&&word.w>=0&&word.h>0)
   .map(word=>({...word,cx:word.x+word.w/2,cy:word.y+word.h/2}));
 }
 function rowsFrom(words){
  const rows=[];
  for(const word of [...words].sort((a,b)=>a.cy-b.cy||a.x-b.x)){
   const row=rows.at(-1);
   if(row&&Math.abs(row.cy-word.cy)<=Math.min(row.h,word.h)*.48){row.words.push(word);row.cy=median(row.words.map(item=>item.cy));row.h=median(row.words.map(item=>item.h));}
   else rows.push({words:[word],cy:word.cy,h:word.h});
  }
  return rows.map(row=>({...row,words:row.words.sort((a,b)=>a.x-b.x)}));
 }
 function headerParts(row){
  const matches=[];
  for(let start=0;start<row.words.length;start++)for(let count=1;count<=4&&start+count<=row.words.length;count++){
   const parts=row.words.slice(start,start+count);
   if(parts.some((word,index)=>index&&word.x-parts[index-1].x-parts[index-1].w>row.h*2.5))break;
   const role=roleKeys.findIndex(names=>names.includes(key(parts.map(word=>word.text).join(' '))));
   if(role<0)continue;
   matches.push({role,parts,x:parts[0].x,right:Math.max(...parts.map(word=>word.x+word.w)),y:median(parts.map(word=>word.y)),h:median(parts.map(word=>word.h))});
  }
  return matches;
 }
 function detect(words){
  const rows=rowsFrom(words),matrices=[];
  for(const row of rows){
   const headers=headerParts(row);
   for(const delivery of headers.filter(header=>header.role===0)){
    const ordered=[delivery];
    for(let role=1;role<5;role++){
     const candidates=headers.filter(header=>header.role===role&&header.x>ordered.at(-1).right).sort((a,b)=>a.x-b.x);
     if(!candidates.length)break;
     ordered.push(candidates[0]);
    }
    if(ordered.length===5)matrices.push({row,headers:ordered});
   }
  }
  // Repeated or side-by-side responsibility matrices need their own verified
  // frames. Do not combine their left columns into a guessed product field.
  if(matrices.length!==1)return null;
  const matrix=matrices[0],height=median(matrix.headers.map(header=>header.h)),delivery=matrix.headers[0];
  // Both left header cells must really be blank. Nearby explicit or clipped
  // header text must keep the ordinary unresolved result instead.
  if(words.some(word=>word.cx<delivery.x-height*.2&&word.cy>=matrix.row.cy-height*1.5&&word.cy<=matrix.row.cy+height*.55))return null;
  const body=rows.filter(row=>row.cy>matrix.row.cy+height*.65),anchors=[],candidates=[];
  let candidateRows=0;
  for(const [index,row] of body.entries()){
   const left=row.words.filter(word=>word.cx<delivery.x-height*.2),text=left.map(word=>word.text).join(' ');
   if(sections.has(key(text))){anchors.push({row,words:left});continue;}
   let hasCandidate=false;
   for(let split=1;split<left.length;split++){
    const before=left.slice(0,split),after=left.slice(split),gap=after[0].x-Math.max(...before.map(word=>word.x+word.w));
    if(gap<height*.8||!/[\p{L}]{2}/u.test(before.map(word=>word.text).join(' '))||empty(after.map(word=>word.text).join(' ')))continue;
    candidates.push({index,x:after[0].x,gap,row,left,before,after});hasCandidate=true;
   }
   if(hasCandidate)candidateRows++;
  }
  const clusters=[];
  for(const candidate of candidates){
   let cluster=clusters.find(item=>Math.abs(item.x-candidate.x)<=height*.7);
   if(!cluster){cluster={x:candidate.x,items:[]};clusters.push(cluster);}
   cluster.items.push(candidate);cluster.x=median(cluster.items.map(item=>item.x));
  }
  const ranked=clusters.map(cluster=>({...cluster,count:new Set(cluster.items.map(item=>item.index)).size})).sort((a,b)=>b.count-a.count);
  const best=ranked[0];
  if(!best||best.count<3||best.count<Math.ceil(candidateRows*.65)||ranked.some(other=>other!==best&&other.count>=Math.max(3,best.count*.65)))return null;
  const validAnchors=anchors.filter(anchor=>anchor.words.length&&Math.max(...anchor.words.map(word=>word.x+word.w))<best.x-height*.4);
  if(new Set(validAnchors.map(anchor=>key(anchor.words.map(word=>word.text).join(' ')))).size<2)return null;
  // Three full component/value rows must sit below an actual section, and
  // each section must precede body evidence in this same bounded matrix.
  const supported=best.items.filter(item=>validAnchors.some(anchor=>anchor.row.cy<item.row.cy));
  if(new Set(supported.map(item=>item.index)).size<3||validAnchors.some(anchor=>!supported.some(item=>item.row.cy>anchor.row.cy)))return null;
  return {...matrix,height,productX:best.x,anchors:validAnchors,bodyRows:best.count};
 }
 function read(options={}){
  const original=legacy.read(options);
  if(original.resolved!==false||options.policy==='all')return original;
  const words=wordsFrom(options.words),profile=detect(words);
  if(!profile)return original;
  const annotated=words.map(word=>({...word}));
  // Section names are explicit text in this verified layout. The native PDF
  // adapter does not retain font weight, so supply it only to this parse.
  for(const anchor of profile.anchors)for(const word of anchor.words){const copy=annotated.find(item=>item===word||item.x===word.x&&item.y===word.y&&item.text===word.text);if(copy)copy.bold=true;}
  const virtual={text:'Produkt',x:profile.productX,y:profile.row.cy-profile.height/2,w:Math.min(profile.height*3,(profile.headers[0].x-profile.productX)*.5),h:profile.height};
  // This is the already existing responsibility-header row. No row is added
  // before the body, preserving the original source-row numbers and IDs.
  const result=legacy.read({...options,words:[...annotated,virtual]});
  if(result.resolved!==true)return original;
  return {...result,profileId,profileEvidence:{blankProductHeader:true,responsibilityHeaders:5,alignedBodyRows:profile.bodyRows,sectionAnchors:profile.anchors.length}};
 }
 return Object.freeze({read});
});
