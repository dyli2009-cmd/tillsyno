/* Versioned, project-local time snapshot shared by Projektering and SmartMatch. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TillsynoProjectionTimes=api;})(typeof globalThis==='object'?globalThis:this,function(){
 const key=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv').replace(/[^a-z0-9]/g,'');
 function validate(value){
  if(value?.version!==1||!Array.isArray(value.entries)||value.entries.length>10000)throw Error('Projektets produkttider har ogiltigt format.');
  const entries=value.entries.map(e=>{
   if(!e||typeof e.product!=='string'||!e.product.trim()||e.product.length>160||typeof e.category!=='string'||e.category.length>40||!['provided','estimated','manual','missing'].includes(e.origin)||e.minutes!==null&&(!Number.isFinite(e.minutes)||e.minutes<0||e.minutes>100000))throw Error('Projektets produkttid är ogiltig.');
   if(!Array.isArray(e.labels)||e.labels.length>30||e.labels.some(l=>typeof l!=='string'||l.length>160))throw Error('Produkttidens kategori är ogiltig.');
   return {product:e.product,category:e.category,minutes:e.minutes,origin:e.origin,labels:[...e.labels]};
  });return {version:1,entries};
 }
 function fromState(state,D,T,M){
  const entries=new Map(),labels=new Map();
  for(const section of D.SECTIONS)for(const row of section.rows){const list=labels.get(row.category)||[];if(!list.includes(row.label))list.push(row.label);labels.set(row.category,list);}
  function add(p,time){const id=p.category+'|'+key(p.name);entries.set(id,{product:p.name,category:p.category,minutes:time?.minutes??null,origin:time?.origin||'missing',labels:labels.get(p.category)||[]});}
  for(const p of [...D.PRODUCTS,...state.customProducts])add(p,T.get(p.category,p.name,p));
  for(const card of Object.values(state.cards))for(const section of D.sectionsForCard(card))for(const def of section.rows){const row=card.rows.find(r=>r.id===def.id);if(!row?.product?.trim())continue;const p=state.customProducts.find(p=>p.category===def.category&&key(p.name)===key(row.product));const id=def.category+'|'+key(row.product);if(!entries.has(id))add({name:row.product,category:def.category},T.get(def.category,row.product,p));}
  for(const row of M.build(state).rows){const id=row.catalogCategory+'|'+key(row.product);entries.delete(id);entries.set(id+'|'+row.component,{product:row.product,category:row.catalogCategory,minutes:row.timePerUnit,origin:row.timePerUnit===null?'missing':row.timeOrigin,labels:[row.component]});}
  return validate({version:1,entries:[...entries.values()]});
 }
 const cached=new WeakMap();
 function index(snapshot){if(cached.has(snapshot))return cached.get(snapshot);const data=validate(snapshot),map=new Map();for(const e of data.entries){const k=key(e.product);if(!map.has(k))map.set(k,[]);map.get(k).push(e);}const result={map,entries:data.entries};cached.set(snapshot,result);return result;}
 function resolve(item,snapshot){
  if(!snapshot||item?.kind==='extra-time')return {found:false};
  const {map,entries}=index(snapshot),candidates=[];
  for(const text of [item?.productName,item?.value,item?.originalProductName,item?.label,[item?.label,item?.value].filter(Boolean).join(' ')]){
   if(!text)continue;const raw=String(text).trim(),stripped=raw.replace(/(?:\s+(?:GS|DT|EL|BH|BEST|ANNAN|[-–—]))+\s*$/ig,'').trim();
   candidates.push(raw,stripped,stripped.replace(/\s+\d+(?:\s*st)?$/i,''));
  }
  for(const value of candidates){const normalized=key(value);let hits=map.get(normalized)||[];
   if(!hits.length)hits=entries.filter(e=>e.labels.some(label=>key(label)+key(e.product)===normalized));
   if(hits.length>1){const label=key(item?.label);const narrowed=hits.filter(e=>e.labels.some(l=>key(l)===label));if(narrowed.length)hits=narrowed;}
   if(hits.length&&hits.every(e=>e.minutes===hits[0].minutes))return {found:true,minutes:hits[0].minutes,origin:hits[0].origin};
  }return {found:false};
 }
 return Object.freeze({validate,fromState,resolve});
});
