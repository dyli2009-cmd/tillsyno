/* One metadata reader for TEST 9.7 preflight, project opening and verification. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SmartMatchReadProjectV97=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const keys=[36,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,13].map(n=>'TillsynoSmartMatchV'+n+'Data');
 function parse(object){
  const candidates=[];
  try{if(typeof object?.decodeText==='function')candidates.push(object.decodeText())}catch(_){}
  try{if(typeof object?.asString==='function')candidates.push(object.asString())}catch(_){}
  for(const candidate of candidates){
   const text=String(candidate??'').trim();
   try{return JSON.parse(text)}catch(_){}
   const hex=text.replace(/^</,'').replace(/>$/,'');
   if(!/^(?:FEFF|FFFE)(?:[0-9A-F]{4})+$/i.test(hex))continue;
   const little=hex.slice(0,4).toUpperCase()==='FFFE',chars=[];
   for(let i=4;i<hex.length;i+=4)chars.push(String.fromCharCode(parseInt(little?hex.slice(i+2,i+4)+hex.slice(i,i+2):hex.slice(i,i+4),16)));
   try{return JSON.parse(chars.join(''))}catch(_){}
  }
  throw Error('Projektinformationen kunde inte tolkas.');
 }
 function read(document,PDFLib){
  const errors=[];let present=false;
  for(const key of keys){
   const raw=document.catalog.get(PDFLib.PDFName.of(key));
   if(!raw)continue;
   present=true;
   try{
    const payload=parse(document.context.lookup(raw));
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Felaktigt projektformat.');
    // A decoded newer payload is authoritative, including an explicit null.
    return {payload,key,present,errors};
   }catch(error){errors.push({key,message:String(error?.message||error)})}
  }
  return {payload:null,key:null,present,errors};
 }
 return Object.freeze({read,parse});
});
