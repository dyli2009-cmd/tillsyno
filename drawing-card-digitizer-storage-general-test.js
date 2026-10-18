(function(root,factory){
 'use strict';
 const api=factory(root||{});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.DrawingCardDigitizerStorage=api;
})(typeof globalThis!=='undefined'?globalThis:(typeof self!=='undefined'?self:this),function(root){
 'use strict';

 const DB_NAME='tillsyno-digital-doorcards-general-test-v1';
 const DB_VERSION=1;
 const STORE_NAME='projects';
 const SCHEMA_VERSION=1;
 const SAMPLE_LIMIT=64*1024;
 const OMIT=Symbol('omit');

 function own(object,key){return Object.prototype.hasOwnProperty.call(object||{},key);}
 function plainObject(value){
  if(!value||Object.prototype.toString.call(value)!=='[object Object]')return false;
  const prototype=Object.getPrototypeOf(value);
  return prototype===Object.prototype||prototype===null;
 }
 function binaryValue(value){
  if(!value||typeof value!=='object')return false;
  const tag=Object.prototype.toString.call(value);
  return tag==='[object ArrayBuffer]'||tag==='[object SharedArrayBuffer]'||tag==='[object Blob]'||tag==='[object File]'||ArrayBuffer.isView(value);
 }
 function forbiddenPayloadKey(key){
  return /^(?:pdfBytes|sourcePdfBytes|sourceBytes|originalBytes|originalPdfBytes|fileBytes|rawPdf|sourcePdf|originalPdf|pdfData|pdfBase64|fileData|sourceFile|fileBlob|blob|arrayBuffer|dataUrl|previewImage|pageImage)$/i.test(String(key||''));
 }
 function cleanValue(value,seen){
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(typeof value==='bigint')return value.toString();
  if(typeof value==='undefined'||typeof value==='function'||typeof value==='symbol'||binaryValue(value))return OMIT;
  if(value instanceof Date)return Number.isFinite(value.getTime())?value.toISOString():null;
  if(!value||typeof value!=='object')return OMIT;
  if(seen.has(value))return null;
  seen.add(value);
  if(Array.isArray(value)){
   const result=value.map(item=>{const cleaned=cleanValue(item,seen);return cleaned===OMIT?null:cleaned;});
   seen.delete(value);
   return result;
  }
  if(!plainObject(value)){seen.delete(value);return OMIT;}
  const result={};
  for(const key of Object.keys(value)){
   if(forbiddenPayloadKey(key))continue;
   const cleaned=cleanValue(value[key],seen);
   if(cleaned!==OMIT)result[key]=cleaned;
  }
  seen.delete(value);
  return result;
 }
 function safeClone(value,fallback){
  const cleaned=cleanValue(value,new WeakSet());
  return cleaned===OMIT?(fallback===undefined?null:fallback):cleaned;
 }
 function clone(value){return safeClone(value,null);}

 function textBytes(value){
  const text=String(value);
  if(typeof TextEncoder!=='undefined')return new TextEncoder().encode(text);
  const escaped=unescape(encodeURIComponent(text));
  const bytes=new Uint8Array(escaped.length);
  for(let index=0;index<escaped.length;index++)bytes[index]=escaped.charCodeAt(index);
  return bytes;
 }
 function hash(bytes,seed){
  let value=seed>>>0;
  for(let index=0;index<bytes.length;index++){
   value^=bytes[index];
   value=Math.imul(value,16777619)>>>0;
  }
  value^=value>>>16;value=Math.imul(value,0x7feb352d)>>>0;
  value^=value>>>15;value=Math.imul(value,0x846ca68b)>>>0;
  return (value^(value>>>16))>>>0;
 }
 function hashPart(bytes){
  const left=hash(bytes,2166136261).toString(16).padStart(8,'0');
  const right=hash(bytes,2246822507).toString(16).padStart(8,'0');
  return left+right;
 }
 function finiteInteger(value,minimum=0){
  const number=Number(value);
  return Number.isFinite(number)?Math.max(minimum,Math.trunc(number)):0;
 }
 function sourceMetadata(source){
  const input=source&&typeof source==='object'?source:{};
  const fileName=String(input.fileName??input.name??'').normalize('NFC').trim();
  const mimeType=String(input.mimeType??input.type??'').trim();
  const result={
   fileName,
   size:finiteInteger(input.size),
   lastModified:finiteInteger(input.lastModified)
  };
  const pageCount=finiteInteger(input.pageCount);
  if(pageCount)result.pageCount=pageCount;
  if(mimeType)result.mimeType=mimeType;
  if(typeof input.fingerprint==='string'&&input.fingerprint.trim())result.fingerprint=input.fingerprint.trim();
  return result;
 }
 function edgeSample(bytes){
  const view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes.buffer||bytes,bytes.byteOffset||0,bytes.byteLength);
  if(view.length<=SAMPLE_LIMIT*2)return view;
  const result=new Uint8Array(SAMPLE_LIMIT*2);
  result.set(view.subarray(0,SAMPLE_LIMIT),0);
  result.set(view.subarray(view.length-SAMPLE_LIMIT),SAMPLE_LIMIT);
  return result;
 }
 async function bytesFromSample(source,sample){
  if(sample===undefined||sample===null||sample===false)return new Uint8Array(0);
  let value=sample===true?source:sample;
  if(value&&typeof value==='object'&&typeof value.slice==='function'&&typeof value.arrayBuffer==='function'){
   const size=finiteInteger(value.size);
   if(size>SAMPLE_LIMIT*2){
    const first=new Uint8Array(await value.slice(0,SAMPLE_LIMIT).arrayBuffer());
    const last=new Uint8Array(await value.slice(Math.max(0,size-SAMPLE_LIMIT),size).arrayBuffer());
    const result=new Uint8Array(first.length+last.length);result.set(first);result.set(last,first.length);return result;
   }
   return new Uint8Array(await value.arrayBuffer());
  }
  if(ArrayBuffer.isView(value))return edgeSample(new Uint8Array(value.buffer,value.byteOffset,value.byteLength));
  if(Object.prototype.toString.call(value)==='[object ArrayBuffer]')return edgeSample(new Uint8Array(value));
  if(typeof value==='string')return edgeSample(textBytes(value));
  return new Uint8Array(0);
 }
 async function fingerprintSource(source,sample){
  const metadata=sourceMetadata(source);
  const identity=[metadata.fileName,metadata.size,metadata.lastModified,metadata.pageCount||0,metadata.mimeType||''].join('\u001f');
  const identityBytes=textBytes(identity),sampleBytes=await bytesFromSample(source,sample);
  const combined=new Uint8Array(identityBytes.length+1+sampleBytes.length);
  combined.set(identityBytes);combined[identityBytes.length]=0;combined.set(sampleBytes,identityBytes.length+1);
  return 'dcd1-'+hashPart(combined);
 }

 function validFingerprint(value){return typeof value==='string'&&value.trim().length>=3&&value.trim().length<=256;}
 function migrateRecord(raw,key){
  if(!plainObject(raw))return null;
  const legacy=plainObject(raw.project)?Object.assign({},raw.project,{fingerprint:raw.fingerprint||raw.id||key}):raw;
  const version=finiteInteger(legacy.schemaVersion??legacy.version);
  if(version>SCHEMA_VERSION)return null;
  const source=sourceMetadata(legacy.source||legacy.sourceMeta||legacy.file||legacy);
  const fingerprint=String(legacy.fingerprint||legacy.id||source.fingerprint||key||'').trim();
  if(!validFingerprint(fingerprint))return null;
  source.fingerprint=fingerprint;
  const template=plainObject(legacy.template)?safeClone(legacy.template,null):null;
  const rawCards=Array.isArray(legacy.cards)?legacy.cards:[];
  const cards=rawCards.filter(plainObject).map(card=>safeClone(card,{}));
  const progress=plainObject(legacy.progress)?safeClone(legacy.progress,{}):{};
  const createdAt=typeof legacy.createdAt==='string'?legacy.createdAt:(typeof legacy.savedAt==='string'?legacy.savedAt:null);
  const updatedAt=typeof legacy.updatedAt==='string'?legacy.updatedAt:(typeof legacy.savedAt==='string'?legacy.savedAt:createdAt);
  return{schemaVersion:SCHEMA_VERSION,fingerprint,source,template,cards,progress,createdAt,updatedAt};
 }
 function normalizedRecord(project,previous,now){
  if(!plainObject(project))throw new TypeError('Projektdata måste vara ett objekt.');
  const source=sourceMetadata(project.source||project.sourceMeta||{});
  const fingerprint=String(project.fingerprint||project.id||source.fingerprint||'').trim();
  if(!validFingerprint(fingerprint))throw new TypeError('Projektet saknar ett giltigt källfingeravtryck.');
  source.fingerprint=fingerprint;
  const instant=new Date(typeof now==='function'?now():Date.now()).toISOString();
  const old=migrateRecord(previous,fingerprint);
  return{
   schemaVersion:SCHEMA_VERSION,
   fingerprint,
   source,
   template:plainObject(project.template)?safeClone(project.template,null):null,
   cards:Array.isArray(project.cards)?project.cards.filter(plainObject).map(card=>safeClone(card,{})):[],
   progress:plainObject(project.progress)?safeClone(project.progress,{}):{},
   createdAt:old?.createdAt||instant,
   updatedAt:instant
  };
 }
 function summary(record){
  const cards=Array.isArray(record.cards)?record.cards:[];
  const approvedCount=cards.filter(card=>/^(?:approved|godk[aä]nt)$/i.test(String(card.review?.status||card.reviewStatus||card.status||''))).length;
  return{
   schemaVersion:record.schemaVersion,
   fingerprint:record.fingerprint,
   source:clone(record.source),
   createdAt:record.createdAt,
   updatedAt:record.updatedAt,
   cardCount:cards.length,
   approvedCount,
   progress:clone(record.progress)
  };
 }

 function requestResult(request){
  return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('IndexedDB-fel'));});
 }
 function transactionDone(transaction){
  return new Promise((resolve,reject)=>{
   transaction.oncomplete=()=>resolve();
   transaction.onabort=()=>reject(transaction.error||new Error('IndexedDB-transaktionen avbröts.'));
   transaction.onerror=()=>reject(transaction.error||new Error('IndexedDB-transaktionen misslyckades.'));
  });
 }
 function indexedBackend(indexedDB){
  let databasePromise;
  function open(){
   if(databasePromise)return databasePromise;
   databasePromise=new Promise((resolve,reject)=>{
    let request;
    try{request=indexedDB.open(DB_NAME,DB_VERSION);}catch(error){reject(error);return;}
    request.onupgradeneeded=()=>{
     const database=request.result;
     if(!database.objectStoreNames.contains(STORE_NAME)){
      const store=database.createObjectStore(STORE_NAME,{keyPath:'fingerprint'});
      store.createIndex('updatedAt','updatedAt',{unique:false});
     }
    };
    request.onsuccess=()=>{
     const database=request.result;
     database.onversionchange=()=>database.close();
     resolve(database);
    };
    request.onerror=()=>reject(request.error||new Error('Kunde inte öppna lokal dörrkortslagring.'));
    request.onblocked=()=>reject(new Error('Lokal dörrkortslagring är blockerad av en annan flik.'));
   }).catch(error=>{databasePromise=null;throw error;});
   return databasePromise;
  }
  async function store(mode,operation){
   const database=await open(),transaction=database.transaction(STORE_NAME,mode),objectStore=transaction.objectStore(STORE_NAME);
   const result=await operation(objectStore);
   if(mode==='readwrite')await transactionDone(transaction);
   return result;
  }
  return{
   async get(key){return store('readonly',objectStore=>requestResult(objectStore.get(key)));},
   async put(value){await store('readwrite',objectStore=>requestResult(objectStore.put(value)));},
   async remove(key){await store('readwrite',objectStore=>requestResult(objectStore.delete(key)));},
   async all(){
    return store('readonly',objectStore=>{
     if(typeof objectStore.getAll==='function')return requestResult(objectStore.getAll());
     return new Promise((resolve,reject)=>{const values=[],request=objectStore.openCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor){resolve(values);return;}values.push(cursor.value);cursor.continue();};request.onerror=()=>reject(request.error);});
    });
   }
  };
 }
 function memoryBackend(initialRecords){
  const records=new Map();
  if(initialRecords instanceof Map){for(const[key,value]of initialRecords)records.set(String(key),clone(value));}
  else if(Array.isArray(initialRecords)){for(const value of initialRecords){const key=value?.fingerprint||value?.id;if(key)records.set(String(key),clone(value));}}
  return{
   async get(key){return records.has(key)?clone(records.get(key)):undefined;},
   async put(value){records.set(value.fingerprint,clone(value));},
   async remove(key){records.delete(key);},
   async all(){return Array.from(records.values(),clone);}
  };
 }

 function createStorage(options={}){
  const fallback=memoryBackend(options.initialRecords);
  const supplied=own(options,'indexedDB')?options.indexedDB:root.indexedDB;
  let primary=supplied&&typeof supplied.open==='function'?indexedBackend(supplied):fallback;
  let backendKind=primary===fallback?'memory':'indexeddb';
  async function execute(method,...args){
   try{return await primary[method](...args);}
   catch(error){
    if(primary===fallback)throw error;
    primary=fallback;backendKind='memory';
    return primary[method](...args);
   }
  }
  async function loadProject(fingerprint){
   const key=String(fingerprint||'').trim();if(!validFingerprint(key))return null;
   const migrated=migrateRecord(await execute('get',key),key);
   return migrated?clone(migrated):null;
  }
  async function saveProject(project){
   const key=String(project?.fingerprint||project?.id||project?.source?.fingerprint||project?.sourceMeta?.fingerprint||'').trim();
   const previous=validFingerprint(key)?await execute('get',key):null;
   const record=normalizedRecord(project,previous,options.now);
   await execute('put',record);
   return clone(record);
  }
  async function deleteProject(fingerprint){
   const key=String(fingerprint||'').trim();if(!validFingerprint(key))return false;
   const existed=Boolean(await execute('get',key));await execute('remove',key);return existed;
  }
  async function listProjects(){
   const values=await execute('all'),result=[];
   for(const value of values){const migrated=migrateRecord(value,value?.fingerprint||value?.id);if(migrated)result.push(summary(migrated));}
   return result.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))||a.fingerprint.localeCompare(b.fingerprint));
  }
  return Object.freeze({
   saveProject,loadProject,deleteProject,listProjects,
   save:saveProject,load:loadProject,remove:deleteProject,list:listProjects,
   fingerprintSource,sourceMetadata,
   getBackend:()=>backendKind
  });
 }
 function createMemoryStorage(options={}){
  if(options instanceof Map||Array.isArray(options))options={initialRecords:options};
  return createStorage(Object.assign({},options,{indexedDB:null}));
 }

 const storage=createStorage();
 return Object.freeze({
  DB_NAME,DB_VERSION,STORE_NAME,SCHEMA_VERSION,
  fingerprintSource,sourceMetadata,createStorage,createMemoryStorage,
  saveProject:storage.saveProject,loadProject:storage.loadProject,deleteProject:storage.deleteProject,listProjects:storage.listProjects,
  save:storage.save,load:storage.load,remove:storage.remove,list:storage.list,
  getBackend:storage.getBackend
 });
});
