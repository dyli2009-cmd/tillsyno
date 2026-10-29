/* Projektering 2.19: reusable personal library and bundled short product register. */
(function(root,factory){
 'use strict';
 const api=factory(()=>typeof module==='object'&&module.exports?require('./smartmatch-projektering-v2-19-data.js'):root.Proj2Data,()=>root.indexedDB);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.Proj2Library=api;
})(typeof window==='object'?window:globalThis,function(dataProvider,indexedDBProvider){
 'use strict';
 const DB_NAME='tillsyno-projektering-bibliotek-v1',STORE_NAME='catalogs',FORMAT='TillsynoProjekteringLibraryV1';
 const LIMITS=Object.freeze({groups:100,prefixes:40,assignments:5000,hiddenCodes:2000,stencils:2000,products:5000,hiddenProducts:6000,fileBytes:5*1024*1024});
 const natural=new Intl.Collator('sv',{numeric:true,sensitivity:'base'}),clone=value=>JSON.parse(JSON.stringify(value));
 const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 const clean=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
 const fold=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv');
 const compact=value=>fold(value).replace(/[^a-z0-9]/g,'');
 const now=()=>new Date().toISOString();
 let opening=null;
 const validatedRecords=new WeakSet();
 function data(){const D=dataProvider();if(!D?.validate||!D?.normalizeCode)throw Error('Bibliotekets projektmodell kunde inte laddas.');return D;}
 function keys(value,allowed,label){
  if(!object(value))throw Error(label+' är ogiltig.');
  const unknown=Object.keys(value).find(key=>!allowed.includes(key));if(unknown)throw Error(label+' innehåller ett okänt fält: '+unknown+'.');
 }
 function text(value,label,max,empty=false){
  if(typeof value!=='string')throw Error(label+' måste vara text.');
  const result=clean(value);if((!empty&&!result)||result.length>max||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(result))throw Error(label+' har ett ogiltigt värde.');return result;
 }
 function id(value,label='ID'){const result=text(value,label,80);if(!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(result)||['constructor','prototype','__proto__'].includes(result.toLowerCase()))throw Error(label+' får bara innehålla bokstäver, siffror och bindestreck.');return result;}
 function array(value,label,max){if(!Array.isArray(value)||value.length>max)throw Error(label+' får innehålla högst '+max+' poster.');return value;}
 function unique(values,label){if(new Set(values).size!==values.length)throw Error(label+' innehåller dubbletter.');return values;}
 function code(value){return data().normalizeCode(value);}
 function prefix(value){const result=text(value,'Beteckningsprefix',24).normalize('NFKC').toUpperCase().replace(/\s+/g,'');if(!/^[A-Z0-9][A-Z0-9-]*(?::[1-9][0-9]*)?$/.test(result))throw Error('Prefix får innehålla bokstäver, siffror, bindestreck och ett avslutande kolon med löpnummer.');return result;}
 function categoryDefinitions(){
  const result=new Map();for(const section of data().SECTIONS)for(const row of section.rows)if(!result.has(row.category))result.set(row.category,row.category==='activation'?'Armbågskontakt / öppnaknapp':row.label);
  return result;
 }
 function category(value){const result=text(value,'Produktkategori',40);if(!categoryDefinitions().has(result))throw Error('Välj en känd produktkategori.');return result;}
 function group(value){
  keys(value,['id','name','section','prefixes','fallback'],'Gruppen');
  if(!['cards','other'].includes(value.section))throw Error('Gruppen måste tillhöra Dörrkort eller Övrigt.');
  if(typeof value.fallback!=='boolean')throw Error('Gruppens reservval är ogiltigt.');
  const prefixes=unique(array(value.prefixes,'Gruppens prefix',LIMITS.prefixes).map(prefix),'Gruppens prefix');
  return{id:id(value.id,'Grupp-ID'),name:text(value.name,'Gruppnamn',80),section:value.section,prefixes,fallback:value.fallback};
 }
 function product(value){
  keys(value,['id','name','category','description'],'Produkten');
  return{id:id(value.id,'Produkt-ID'),name:text(value.name,'Produktnamn',160),category:category(value.category),description:text(value.description??'','Produktbeskrivning',400,true)};
 }
 function stencil(value){
  keys(value,['id','name','code','kind','productType','category','shape','fill','stroke','textColor','width','height','fontSize'],'Stencilmallen');
  const state={schema:2,project:{id:'library-validation',name:'Bibliotek',revision:1,updatedAt:now()},drawing:{name:'',pages:[]},cards:{},stencils:{[value.id]:value},placements:[],customProducts:[],preferences:data().defaultPreferences()};
  return data().validate(data().upgradeRestroomStencils(state)).stencils[value.id];
 }
 function validate(raw){
  keys(raw,['schema','revision','updatedAt','labels','groups','assignments','hiddenCodes','stencils','products','hiddenProductIds','categoryLabels'],'Biblioteket');
  if(raw.schema!==1)throw Error('Biblioteket har en okänd version.');
  if(!Number.isSafeInteger(raw.revision)||raw.revision<1||raw.revision>1000000000)throw Error('Bibliotekets revision är ogiltig.');
  const updatedAt=text(raw.updatedAt,'Bibliotekets sparade tid',40);if(!/^\d{4}-\d{2}-\d{2}T/.test(updatedAt)||!Number.isFinite(Date.parse(updatedAt)))throw Error('Bibliotekets sparade tid är ogiltig.');
  keys(raw.labels,['cards','other'],'Huvudgruppernas namn');
  const labels={cards:text(raw.labels.cards,'Dörrkortens namn',60),other:text(raw.labels.other,'Symbolernas namn',60)};
  if(fold(labels.cards)===fold(labels.other))throw Error('Huvudgrupperna måste ha olika namn.');
  let groups=array(raw.groups,'Grupperna',LIMITS.groups).map(group);
  // Keep DBL and restroom door cards together at the top, including saved libraries.
  const mergedGroups=groups.filter(value=>value.section==='cards'&&!value.fallback&&['DBL','WC','HWC','WC-HWC'].includes(value.id));
  const combined=groups.find(value=>value.id==='DBL-WC'&&value.section==='cards');
  if(mergedGroups.length||combined){
   const prefixes=[...new Set((combined?.prefixes||[]).concat(mergedGroups.flatMap(value=>value.prefixes)))];
   const target=combined?{...combined,prefixes}:{id:'DBL-WC',name:'DBL / WC',section:'cards',prefixes,fallback:false};
   groups=groups.filter(value=>!mergedGroups.includes(value)&&value!==combined);groups.unshift(target);
  }
  groups=groups.map(value=>value.id==='cards-other'&&value.section==='cards'?{...value,name:'Övriga dörrkort'}:value);
  unique(groups.map(value=>value.id),'Grupp-ID');unique(groups.map(value=>value.section+':'+fold(value.name)),'Gruppnamnen');
  unique(groups.flatMap(value=>value.prefixes.map(start=>value.section+':'+start)),'Gruppernas prefix');
  for(const section of ['cards','other'])if(groups.filter(value=>value.section===section&&value.fallback).length!==1)throw Error('Varje huvudgrupp måste ha exakt en reservgrupp.');
  if(!object(raw.assignments)||Object.keys(raw.assignments).length>LIMITS.assignments)throw Error('Stencilernas grupper är ogiltiga.');
  const assignments={};for(const [name,value]of Object.entries(raw.assignments)){const normalized=code(name);if(normalized!==name||Object.hasOwn(assignments,normalized))throw Error('En gruppkoppling har en ogiltig beteckning.');let target=value;if(mergedGroups.some(entry=>entry.id===value))target='DBL-WC';const groupId=id(target,'Grupp-ID');if(!groups.some(item=>item.id===groupId))throw Error('En stencils grupp saknas.');assignments[normalized]=groupId;}
  const hiddenCodes=unique(array(raw.hiddenCodes,'Dolda stenciler',LIMITS.hiddenCodes).map(code),'Dolda stenciler');
  const stencils=array(raw.stencils,'Stencilmallarna',LIMITS.stencils).map(stencil);
  unique(stencils.map(value=>value.id),'Stencilmallarnas ID');unique(stencils.map(value=>data().matchKey(value.code)),'Stencilmallarnas beteckningar');
  const products=array(raw.products,'Produkterna',LIMITS.products).map(product);unique(products.map(value=>value.id),'Produkt-ID');
  const hiddenProductIds=unique(array(raw.hiddenProductIds,'Dolda produkter',LIMITS.hiddenProducts).map(value=>id(value,'Produkt-ID')),'Dolda produkter');
  if(!object(raw.categoryLabels))throw Error('Produktkategoriernas namn är ogiltiga.');
  const categoryLabels={};for(const [key,value]of Object.entries(raw.categoryLabels))categoryLabels[category(key)]=text(value,'Kategorinamn',80);
  const result={schema:1,revision:raw.revision,updatedAt,labels,groups,assignments,hiddenCodes,stencils,products,hiddenProductIds,categoryLabels};validatedRecords.add(result);return result;
 }
 function read(lib){return object(lib)&&validatedRecords.has(lib)?lib:validate(lib);}
 function createDefault(){return validate({schema:1,revision:1,updatedAt:now(),labels:{cards:'Dörrkort',other:'Övrigt'},groups:[
  {id:'DBL-WC',name:'DBL / WC',section:'cards',prefixes:['DBL','WC','HWC'],fallback:false},
  {id:'GS',name:'GS1–GS100',section:'cards',prefixes:['GS'],fallback:false},
  {id:'cards-other',name:'Övriga dörrkort',section:'cards',prefixes:[],fallback:true},
  {id:'symbols-other',name:'Övrigt',section:'other',prefixes:[],fallback:true}
 ],assignments:{},hiddenCodes:['VC','HVC'],stencils:[],products:[],hiddenProductIds:[],categoryLabels:{}});}
 function changed(lib,mutate){const next=validate(lib);mutate(next);next.revision++;next.updatedAt=now();return validate(next);}
 function groupsFor(lib,section){if(!['cards','other'].includes(section))throw Error('Välj Dörrkort eller Övrigt.');return clone(read(lib).groups.filter(value=>value.section===section));}
 function groupFor(lib,item){
  const valid=read(lib),section=item?.kind==='card'?'cards':'other',name=code(item?.code),groups=valid.groups.filter(value=>value.section===section);
  const explicit=groups.find(value=>value.id===valid.assignments[name]);if(explicit)return explicit.id;
  let best=null;for(const entry of groups)for(const start of entry.prefixes){const matches=entry.id==='GS'&&start==='GS'?/^GS-?(?:[1-9][0-9]?|100)(?::[1-9][0-9]*|-[A-Z0-9-]+|[A-Z][A-Z0-9-]*)?$/.test(name):name.startsWith(start);if(matches&&(!best||start.length>best.length))best={id:entry.id,length:start.length};}
  return best?.id||groups.find(value=>value.fallback).id;
 }
 function categories(lib){const valid=read(lib);return[...categoryDefinitions()].map(([id,label])=>({id,label:valid.categoryLabels[id]||label}));}
 function listProducts(lib,state,categoryId='all'){
  const valid=read(lib);if(categoryId!=='all'&&categoryId!=='')category(categoryId);
  const entries=new Map(data().PRODUCTS.map(value=>[value.id,{value:clone(value),priority:0}]));
  const retired=value=>typeof data().isRetiredProduct==='function'&&data().isRetiredProduct(value);
  for(const raw of array(state?.customProducts||[],'Projektets produkter',data().LIMITS.customProducts)){const value=product(raw);if(!retired(value))entries.set(value.id,{value,priority:1});}
  for(const value of valid.products)if(!retired(value))entries.set(value.id,{value,priority:2});
  const hidden=new Set(valid.hiddenProductIds),names=new Set(),result=[];
  // Preserve hides of old built-in real models, but never map the retired v1
  // import IDs: the short v2 file deliberately hides those while keeping its models.
  for(const [previous,current]of Object.entries(data().PRODUCT_ALIASES||{}))if(hidden.has(previous)&&!entries.has(previous))hidden.add(current);
  for(const {value} of [...entries.values()].sort((a,b)=>b.priority-a.priority)){
   if(hidden.has(value.id)||(categoryId&&categoryId!=='all'&&value.category!==categoryId))continue;
   const key=typeof data().productIdentity==='function'?data().productIdentity(value):value.category+':'+fold(value.name);if(names.has(key))continue;names.add(key);result.push(clone(value));
  }
  return result.sort((a,b)=>natural.compare(a.name,b.name)||natural.compare(a.id,b.id));
 }
 function searchProducts(lib,state,categoryId='all',query=''){
  const entries=listProducts(lib,state,categoryId),needle=compact(query);if(!needle)return entries;
  const words=fold(query).split(/[^a-z0-9]+/).filter(Boolean);
  const rank=value=>{
   const name=compact(value.name);if(name===needle)return 0;if(name.startsWith(needle))return 1;
   const tokens=fold(value.name).split(/[^a-z0-9]+/).filter(Boolean);if(words.every(word=>tokens.some(token=>token.startsWith(word))))return 2;
   return needle.length>=2&&name.includes(needle)?3:Infinity;
  };
  return entries.map(value=>({value,rank:rank(value)})).filter(item=>Number.isFinite(item.rank)).sort((a,b)=>a.rank-b.rank||natural.compare(a.value.name,b.value.name)).map(item=>item.value);
 }
 const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
 function saveGroup(lib,input){return changed(lib,next=>{if(!object(input))throw Error('Gruppen saknas.');const existing=next.groups.find(value=>value.id===input.id),entry=group({prefixes:[],fallback:false,...existing,...input,id:input.id||uid('grupp')});const index=next.groups.findIndex(value=>value.id===entry.id);if(index<0)next.groups.push(entry);else next.groups[index]=entry;});}
 function removeGroup(lib,groupId,fallbackGroupId=null){return changed(lib,next=>{
  const entry=next.groups.find(value=>value.id===groupId);if(!entry)throw Error('Gruppen finns inte.');
  const target=next.groups.find(value=>value.id!==groupId&&value.section===entry.section&&(fallbackGroupId?value.id===fallbackGroupId:value.fallback));
  if(!target)throw Error('Välj en annan grupp i samma huvudgrupp innan den tas bort.');
  target.prefixes=[...new Set(target.prefixes.concat(entry.prefixes))];
  if(entry.fallback)target.fallback=true;
  next.groups=next.groups.filter(value=>value.id!==groupId);for(const name of Object.keys(next.assignments))if(next.assignments[name]===groupId)next.assignments[name]=target.id;
 });}
 function assignGroup(lib,name,groupId){return changed(lib,next=>{if(!next.groups.some(value=>value.id===groupId))throw Error('Gruppen finns inte.');next.assignments[code(name)]=groupId;});}
 function saveProduct(lib,input){return changed(lib,next=>{
  if(!object(input))throw Error('Produkten saknas.');const existing=next.products.find(value=>value.id===input.id)||data().PRODUCTS.find(value=>value.id===input.id)||data().LEGACY_PRODUCTS?.find(value=>value.id===input.id),entry=product({...existing,...input,id:input.id||uid('produkt')});const index=next.products.findIndex(value=>value.id===entry.id);if(index<0)next.products.push(entry);else next.products[index]=entry;next.hiddenProductIds=next.hiddenProductIds.filter(value=>value!==entry.id);
 });}
 function removeProduct(lib,productId,source=null){return changed(lib,next=>{
  id(productId,'Produkt-ID');
  // Retain a hidden edited alias as its tombstone. Without the record, a later
  // read could mistake deletion of a personal variant for hiding the old default.
  const stored=next.products.find(value=>value.id===productId),alias=Object.hasOwn(data().PRODUCT_ALIASES||{},productId);
  const candidate=stored||(alias&&source?product(source):null);
  if(candidate&&candidate.id!==productId)throw Error('Produkten som tas bort har ett annat ID.');
  const keepAlias=alias&&candidate&&!data().isRetiredProduct(candidate);
  next.products=next.products.filter(value=>value.id!==productId||keepAlias);
  if(keepAlias&&!stored)next.products.push(candidate);
  if(!next.hiddenProductIds.includes(productId))next.hiddenProductIds.push(productId);
 });}
 function saveStencil(lib,input){return changed(lib,next=>{
  const entry=stencil({...input,id:code(input?.code)}),match=data().matchKey(entry.code);
  const aliases=next.stencils.filter(value=>value.code!==entry.code&&data().matchKey(value.code)===match);
  if(aliases.some(value=>!next.hiddenCodes.includes(value.code)))throw Error('Beteckningen '+entry.code+' kan förväxlas med en synlig stencilmall. Dölj den tidigare mallen först.');
  next.stencils=next.stencils.filter(value=>!aliases.some(alias=>alias.id===value.id));
  const byCode=next.stencils.findIndex(value=>value.code===entry.code),byId=next.stencils.findIndex(value=>value.id===entry.id);if(byCode>=0&&byId>=0&&byCode!==byId)throw Error('Stencilmallens ID används av en annan beteckning.');const index=Math.max(byCode,byId);if(index<0)next.stencils.push(entry);else next.stencils[index]=entry;next.hiddenCodes=next.hiddenCodes.filter(value=>value!==entry.code);
 });}
 function isHidden(lib,name){const value=code(name);return /^DGS(?:100)?(?::[1-9][0-9]*)?$/.test(value)||read(lib).hiddenCodes.includes(value);}
 function setHidden(lib,name,hidden){if(typeof hidden!=='boolean')throw Error('Stencilens synlighet är ogiltig.');return changed(lib,next=>{const value=code(name);next.hiddenCodes=next.hiddenCodes.filter(item=>item!==value);if(hidden)next.hiddenCodes.push(value);});}
 function setLabels(lib,patch){keys(patch,['cards','other'],'Huvudgruppernas namn');return changed(lib,next=>Object.assign(next.labels,patch));}
 function setCategoryLabel(lib,key,label){return changed(lib,next=>{next.categoryLabels[category(key)]=text(label,'Kategorinamn',80);});}
 function merge(current,imported){
  const incoming=validate(imported);return changed(current,next=>{
   const remap=new Map();
   for(const entry of incoming.groups){
    const existing=next.groups.find(value=>value.id===entry.id)||next.groups.find(value=>value.section===entry.section&&fold(value.name)===fold(entry.name));
    if(existing){remap.set(entry.id,existing.id);continue;}
    const used=new Set(next.groups.filter(value=>value.section===entry.section).flatMap(value=>value.prefixes));
    next.groups.push({...entry,prefixes:entry.prefixes.filter(value=>!used.has(value)),fallback:false});remap.set(entry.id,entry.id);
   }
   for(const [name,value]of Object.entries(incoming.assignments))if(!Object.hasOwn(next.assignments,name)&&remap.has(value))next.assignments[name]=remap.get(value);
   for(const value of incoming.products)if(!next.products.some(entry=>entry.id===value.id))next.products.push(value);
   for(const value of incoming.stencils)if(!next.stencils.some(entry=>entry.id===value.id||data().matchKey(entry.code)===data().matchKey(value.code)))next.stencils.push(value);
   next.hiddenCodes=[...new Set(next.hiddenCodes.concat(incoming.hiddenCodes))];next.hiddenProductIds=[...new Set(next.hiddenProductIds.concat(incoming.hiddenProductIds))];
   next.categoryLabels={...incoming.categoryLabels,...next.categoryLabels};
  });
 }
 function owner(value='device'){return text(value,'Bibliotekets ägare',200);}
 function storageError(error){
  const result=new Error(error?.name==='QuotaExceededError'?'Det finns inte tillräckligt med utrymme för biblioteket. Den tidigare kopian har behållits.':error?.name==='AbortError'?'Biblioteket kunde inte sparas. Den tidigare kopian har behållits.':['SecurityError','NotAllowedError'].includes(error?.name)?'Webbläsaren tillåter inte lokal bibliotekslagring.':error?.message||'Bibliotekets lokala lagring kunde inte öppnas.');result.name=error?.name||'Error';return result;
 }
 function database(){
  if(opening)return opening;
  let provider;try{provider=indexedDBProvider();}catch(error){return Promise.reject(storageError(error));}if(!provider)return Promise.reject(Error('Webbläsaren saknar lokal bibliotekslagring.'));
  let request,abandoned=false;opening=new Promise((resolve,reject)=>{
   const fail=error=>{abandoned=true;opening=null;reject(storageError(error));};
   try{request=provider.open(DB_NAME,1);}catch(error){fail(error);return;}
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE_NAME))request.result.createObjectStore(STORE_NAME);};
   request.onerror=()=>fail(request.error);request.onblocked=()=>fail(Error('Biblioteket är upptaget i en annan flik. Stäng fliken och försök igen.'));
   request.onsuccess=()=>{const db=request.result;if(abandoned){db.close();return;}db.onversionchange=()=>{db.close();opening=null;};db.onclose=()=>{opening=null;};resolve(db);};
  });const pending=opening;pending.catch(()=>{if(opening===pending)opening=null;});return pending;
 }
 async function transaction(mode,operation){
  const db=await database();return new Promise((resolve,reject)=>{
   let tx,result,settled=false;const fail=error=>{if(!settled){settled=true;reject(storageError(error));}};
   try{tx=db.transaction(STORE_NAME,mode);tx.onabort=()=>fail(tx.error||{name:'AbortError'});tx.onerror=()=>{};tx.oncomplete=()=>{if(!settled){settled=true;resolve(result);}};const request=operation(tx.objectStore(STORE_NAME),{fail});if(request)request.onsuccess=()=>{result=request.result;};}
   catch(error){if(error?.name==='InvalidStateError')opening=null;try{tx?.abort();}catch(_){}fail(error);}
  });
 }
 async function load(ownerKey='device'){const record=await transaction('readonly',store=>store.get(owner(ownerKey)));if(record===undefined)return null;return validate(record);}
 async function save(lib,ownerKey='device',options={}){
  const snapshot=validate(lib),key=owner(ownerKey);keys(options,['expectedRevision'],'Sparvillkoret');
  const compare=Object.hasOwn(options,'expectedRevision'),expected=options.expectedRevision;
  if(compare&&expected!==null&&(!Number.isSafeInteger(expected)||expected<1||expected>1000000000))throw Error('Bibliotekets förväntade revision är ogiltig.');
  await transaction('readwrite',(store,control)=>{
   if(!compare)return store.put(snapshot,key);
   const request=store.get(key);request.onsuccess=()=>{
    try{
     const actual=request.result===undefined?null:validate(request.result).revision;
     if(actual!==expected){const error=new Error('Biblioteket har ändrats i en annan flik. Läs in den sparade versionen och försök igen.');error.name='ConflictError';control.fail(error);store.transaction.abort();return;}
     store.put(snapshot,key);
    }catch(error){control.fail(error);try{store.transaction.abort();}catch(_){};}
   };
  });return snapshot;
 }
 async function close(){const pending=opening;opening=null;if(pending)try{(await pending).close();}catch(_){};}
 function pack(lib){const result=new TextEncoder().encode(JSON.stringify({format:FORMAT,library:validate(lib)}));if(result.byteLength>LIMITS.fileBytes)throw Error('Biblioteksfilen får vara högst 5 MB.');return result;}
 function unpack(input){
  let source;if(typeof input==='string'){if(input.length>LIMITS.fileBytes||new TextEncoder().encode(input).length>LIMITS.fileBytes)throw Error('Biblioteksfilen får vara högst 5 MB.');source=input;}
  else{const bytes=input instanceof Uint8Array?input:input instanceof ArrayBuffer?new Uint8Array(input):null;if(!bytes)throw Error('Välj en sparad biblioteksfil.');if(bytes.byteLength>LIMITS.fileBytes)throw Error('Biblioteksfilen får vara högst 5 MB.');try{source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch(_){throw Error('Biblioteksfilen innehåller inte giltig text.');}}
  let raw;try{raw=JSON.parse(source);}catch(_){throw Error('Biblioteksfilen kunde inte läsas.');}keys(raw,['format','library'],'Biblioteksfilen');if(raw.format!==FORMAT)throw Error('Filen är inte ett projekteringsbibliotek.');return validate(raw.library);
 }
 return Object.freeze({DB_NAME,STORE_NAME,FORMAT,LIMITS,createDefault,validate,groupsFor,groupFor,categories,listProducts,searchProducts,saveGroup,removeGroup,assignGroup,saveProduct,removeProduct,saveStencil,isHidden,setHidden,setLabels,setCategoryLabel,merge,load,save,close,pack,unpack});
});
