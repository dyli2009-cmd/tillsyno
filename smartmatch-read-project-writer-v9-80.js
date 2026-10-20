/* TEST 9.80: standard UTF-16 PDF project strings with bounded encoding scratch. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SmartMatchReadProjectWriterV980=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const blockUnits=8192,blocksPerReport=16;
 const byteHex=Array.from({length:256},(_,value)=>value.toString(16).padStart(2,'0').toUpperCase());
 const yieldTick=()=>new Promise(resolve=>setTimeout(resolve,0));
 async function create(payload,PDFLib,report=yieldTick){
  if(typeof PDFLib?.PDFHexString?.of!=='function')throw Error('PDF-kodaren kunde inte laddas.');
  // JSON.stringify retains its established handling of undefined, escaping,
  // property order and toJSON. Never build an additional full numeric array.
  let json=JSON.stringify(payload);
  if(typeof json!=='string')throw Error('Projektinformationen kunde inte läsas för sparning.');
  const total=json.length,parts=['FEFF'];
  await report(58,'Kodar projektinformationen','0 av '+total+' tecken.');
  let blocks=0;
  for(let offset=0;offset<total;offset+=blockUnits){
   const end=Math.min(offset+blockUnits,total),row=new Array(end-offset);
   for(let i=offset;i<end;i++){
    // The PDF uses UTF-16 code units, so surrogate pairs may cross block edges.
    const unit=json.charCodeAt(i);
    row[i-offset]=byteHex[unit>>>8]+byteHex[unit&255];
   }
   parts.push(row.join(''));
   if(++blocks%blocksPerReport===0||end===total)
    await report(58+Math.floor(3*end/Math.max(1,total)),'Kodar projektinformationen',end+' av '+total+' tecken.');
  }
  json=null;
  const hex=parts.join('');parts.length=0;
  const metadata=PDFLib.PDFHexString.of(hex);
  // Returning a standard direct string preserves existing project readers.
  // The caller installs it only after every report/cancellation check succeeds.
  await report(62,'Projektinformationen kodad',total+' av '+total+' tecken.');
  return metadata;
 }
 return Object.freeze({create});
});

