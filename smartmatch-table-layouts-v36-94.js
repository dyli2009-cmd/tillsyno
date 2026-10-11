(() => {
'use strict';

// Additional, verified layouts. The app's locked first-cell reader keeps priority.
const profiles=Object.freeze([
 Object.freeze({id:'card-title-object-components-v1',source:'explicit-card-title',
  description:'Dörrkort-titel, Objekt-rad och Komponent/Produkt-tabell'})
]);
const titlePattern=/^(?:DÖRRKORT|DORRKORT|BESLAGSKORT)\s*[:#]?\s+(.+)$/i;
const componentPattern=/^(?:DÖRRAUTOMATIK|DORRAUTOMATIK|LÅS|LAS|LÅSHUS|LASHUS|ELSLUTBLECK|SLUTBLECK|HANDTAG|GLAS|MAGNET|DÖRRSTÄNGARE|DORRSTANGARE|ARMBÅGSKONTAKT|ARMBAGKONTAKT)$/i;
const clean=value=>String(value||'').normalize('NFC').replace(/[\u00a0\u2007\u202f]/g,' ').replace(/\s+/g,' ').trim();
const left=row=>Math.min(...(row?.items||[]).map(item=>item.x));

function identify(text,{groupLines,normalizeCardLabel}={}){
 if(typeof groupLines!=='function'||typeof normalizeCardLabel!=='function')return null;
 const rows=groupLines(text?.items||[]);
 // A drawing title/scale must never be treated as a card by this profile.
 if(rows.some(row=>/\b(?:PLANRITNING|PLAN\s*RITNING|SKALA\s*1\s*:)/i.test(row.text)))return null;
 const titles=rows.map((row,i)=>({row,i,match:clean(row.text).match(titlePattern)})).filter(t=>t.match);
 if(titles.length!==1)return null;
 const title=titles[0],object=rows[title.i+1],header=rows[title.i+2];
 const titleItems=[...(title.row.items||[])].sort((a,b)=>a.x-b.x);
 for(let i=1;i<titleItems.length;i++){
  const previous=titleItems[i-1],item=titleItems[i];
  if(item.x-(previous.x+Math.max(previous.w,1))>Math.max(previous.h,item.h,5)*2.5)return null;
 }
 // These consecutive rows define this particular known layout. Other layouts
 // remain unresolved rather than borrowing an ID from arbitrary page text.
 if(!object||!header||!/^OBJEKT\s*:\s*\S.*$/i.test(clean(object.text)))return null;
 if(clean(header.label).toUpperCase()!=='KOMPONENT'||clean(header.value).toUpperCase()!=='PRODUKT')return null;
 const ordered=[...(header.items||[])].sort((a,b)=>a.x-b.x);
 const firstRight=ordered.find(item=>/^PRODUKT$/i.test(clean(item.text)));
 if(!ordered.length||!firstRight)return null;
 const size=Math.max(5,...ordered.map(item=>Number(item.h)||0));
 const lx=ordered[0].x,rx=firstRight.x,tx=left(title.row),ox=left(object);
 if(rx-lx<size*6||tx<lx-size*6||tx>lx+size||Math.abs(ox-tx)>size*2)return null;
 const titleGap=title.row.y-object.y,objectGap=object.y-header.y;
 if(titleGap<=0||titleGap>size*4||objectGap<=0||objectGap>size*4)return null;
 const firstComponent=rows[title.i+3];
 if(!firstComponent||header.y-firstComponent.y<=0||header.y-firstComponent.y>size*4)return null;
 const body=[...(firstComponent.items||[])].sort((a,b)=>a.x-b.x);
 const bodyLeft=body.filter(item=>item.x<rx-size);
 const bodyRight=body.filter(item=>item.x>=rx-size);
 if(!bodyLeft.length||Math.abs(bodyLeft[0].x-lx)>size*2)return null;
 if(!componentPattern.test(clean(bodyLeft.map(item=>item.text).join(' '))))return null;
 if(bodyRight.length&&Math.abs(bodyRight[0].x-rx)>size*2)return null;
 const printedId=clean(title.match[1]);
 // Only one plain printed ID belongs to this profile. In particular, do not
 // concatenate two number groups ('GS1 1') into a different card ('GS11').
 if(!/^(?:[A-ZÅÄÖ]{0,5}[\s/_-]*\d{1,6}[\s/_-]*[A-ZÅÄÖ]{0,4}|[A-ZÅÄÖ]{2,6})$/i.test(printedId))return null;
 const code=normalizeCardLabel(printedId);
 if(!code)return null;
 return {code,row:clean(title.row.text),order:title.i,area:'known-layout-card-heading',profileId:profiles[0].id};
}

window.SmartMatchTableLayouts=Object.freeze({profiles,identify});
})();
