/* Avläsning 9.99: the verified unheaded matrix may be marked only through
 * Lev av and Mont av. Existing readers and responsibility rules stay intact.
 */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./smartmatch-read-work-v9-98.js'));
 else root.SmartMatchReadWork=factory(root.SmartMatchReadWork);
})(typeof window!=='undefined'?window:globalThis,function(previous){
 'use strict';
 if(!previous||typeof previous.read!=='function')throw Error('Den befintliga tabelläsaren saknas.');
 const profileId='responsibility-matrix-two-owner-columns-v1';
 const clean=value=>String(value??'').normalize('NFC').replace(/\s+/g,' ').trim();
 const key=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv').replace(/[^a-z0-9]/g,'');
 const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
 const empty=value=>!clean(value)||/^(?:[-–—―_.|\s]+|ej\s+aktuellt|ingår\s+ej|ej\s+bestämt|saknas|n\/a)$/i.test(clean(value));
 const sections=new Set(['daglasning','daglas','nattlasning','nattlas','dorrstangning','ovrigutrustning','larmpasser','larmochpasser','larmpassage']);
 const ownerKeys=[['levav','levererasav'],['montav','monterasav']];
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
   const owner=ownerKeys.findIndex(names=>names.includes(key(parts.map(word=>word.text).join(' '))));
   if(owner<0)continue;
   matches.push({owner,x:parts[0].x,right:Math.max(...parts.map(word=>word.x+word.w)),h:median(parts.map(word=>word.h))});
  }
  return matches;
 }
 function detect(words){
  const rows=rowsFrom(words),matrices=[];
  for(const row of rows){
   const headers=headerParts(row),deliveries=headers.filter(header=>header.owner===0),installations=headers.filter(header=>header.owner===1);
   if(!deliveries.length||!installations.length)continue;
   // Extra copies or multiple same-row matrices cannot establish one frame.
   if(deliveries.length!==1||installations.length!==1)return null;
   if(installations[0].x>deliveries[0].right)matrices.push({row,headers:[deliveries[0],installations[0]]});
  }
  if(matrices.length!==1)return null;
  const matrix=matrices[0],height=median(matrix.headers.map(header=>header.h)),delivery=matrix.headers[0];
  // An actual or clipped heading to the left must not be replaced by a guess.
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
    candidates.push({index,x:after[0].x,row});hasCandidate=true;
   }
   if(hasCandidate)candidateRows++;
  }
  const clusters=[];
  for(const candidate of candidates){
   let cluster=clusters.find(item=>Math.abs(item.x-candidate.x)<=height*.7);
   if(!cluster){cluster={x:candidate.x,items:[]};clusters.push(cluster);}
   cluster.items.push(candidate);cluster.x=median(cluster.items.map(item=>item.x));
  }
  const ranked=clusters.map(cluster=>({...cluster,count:new Set(cluster.items.map(item=>item.index)).size})).sort((a,b)=>b.count-a.count),best=ranked[0];
  if(!best||best.count<3||best.count<Math.ceil(candidateRows*.65)||ranked.some(other=>other!==best&&other.count>=Math.max(3,best.count*.65)))return null;
  const validAnchors=anchors.filter(anchor=>anchor.words.length&&Math.max(...anchor.words.map(word=>word.x+word.w))<best.x-height*.4);
  if(new Set(validAnchors.map(anchor=>key(anchor.words.map(word=>word.text).join(' ')))).size<2)return null;
  const supported=best.items.filter(item=>validAnchors.some(anchor=>anchor.row.cy<item.row.cy));
  if(new Set(supported.map(item=>item.index)).size<3)return null;
  return {...matrix,height,productX:best.x,anchors:validAnchors,bodyRows:best.count};
 }
 function read(options={}){
  const original=previous.read(options);
  if(original.resolved!==false||options.policy==='all')return original;
  const words=wordsFrom(options.words),profile=detect(words);
  if(!profile)return original;
  const annotated=words.map(word=>({...word}));
  for(const anchor of profile.anchors)for(const word of anchor.words){const copy=annotated.find(item=>item.x===word.x&&item.y===word.y&&item.text===word.text);if(copy)copy.bold=true;}
  const virtual={text:'Produkt',x:profile.productX,y:profile.row.cy-profile.height/2,w:Math.min(profile.height*3,(profile.headers[0].x-profile.productX)*.5),h:profile.height};
  // The virtual heading shares the existing owner-header row. All original
  // word data and body-row identities remain unchanged outside this parse.
  const result=previous.read({...options,words:[...annotated,virtual]});
  if(result.resolved!==true)return original;
  return {...result,profileId,profileEvidence:{blankProductHeader:true,responsibilityHeaders:2,alignedBodyRows:profile.bodyRows,sectionAnchors:profile.anchors.length}};
 }
 return Object.freeze({read});
});
