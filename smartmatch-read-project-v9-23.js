/* TEST 9.23: bounded UTF-16 decoding of large embedded project JSON.
   Keep the established API so opening and export verification share a reader. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SmartMatchReadProjectV97=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const keys=[36,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,13].map(n=>'TillsynoSmartMatchV'+n+'Data');
 function digit(code){
  if(code>=48&&code<=57)return code-48;
  if(code>=65&&code<=70)return code-55;
  if(code>=97&&code<=102)return code-87;
  return -1;
 }
 function utf16Hex(value){
  let text=String(value??'').trim();
  if(text[0]==='<'&&text[text.length-1]==='>')text=text.slice(1,-1);
  const bom=text.slice(0,4).toUpperCase();
  if(bom!=='FEFF'&&bom!=='FFFE')return null;
  // A single character class is linear; a repeated four-character group can
  // exhaust the regex stack on multi-megabyte OCR/project information.
  text=text.replace(/\s/g,'');
  if(text.length%4)throw Error('Ofullständig UTF-16-projektinformation.');
  const little=bom==='FFFE',blocks=[],units=[];
  for(let i=4;i<text.length;i+=4){
   const a=digit(text.charCodeAt(i)),b=digit(text.charCodeAt(i+1)),c=digit(text.charCodeAt(i+2)),d=digit(text.charCodeAt(i+3));
   if((a|b|c|d)<0)throw Error('Ogiltig hexadecimal projektinformation.');
   units.push(little?(c*16+d)*256+a*16+b:(a*16+b)*256+c*16+d);
   // Bounded arguments avoid PDFLib's large decodeText/fromCodePoint call.
   // Joining code units also preserves surrogate pairs across block edges.
   if(units.length===8192){blocks.push(String.fromCharCode(...units));units.length=0;}
  }
  if(units.length)blocks.push(String.fromCharCode(...units));
  return blocks.join('');
 }
 function parse(object){
  let raw;
  try{if(typeof object?.asString==='function')raw=object.asString();}catch(_){}
  if(raw!==undefined){
   const decoded=utf16Hex(raw);
   if(decoded!==null)return JSON.parse(decoded);
  }
  // Literal/PDFDocEncoding strings retain the library's normal text decoding.
  try{if(typeof object?.decodeText==='function')return JSON.parse(object.decodeText());}catch(_){}
  if(raw!==undefined)return JSON.parse(String(raw).trim());
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
    // A decoded newer payload, including readTestData:null, is authoritative.
    return {payload,key,present,errors};
   }catch(error){errors.push({key,message:String(error?.message||error)});}
  }
  return {payload:null,key:null,present,errors};
 }
 return Object.freeze({read,parse});
});
