/* Exact manual ID stepping. Only the final digit group changes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SecurityManualNumbering=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function parts(value){return String(value??'').trim().normalize('NFC').match(/^(.*?)([0-9]+)$/u);}
 function next(value,direction){
  const match=parts(value);if(!match)return null;
  const digits=match[2],number=BigInt(digits)+(direction<0?-1n:1n);if(number<0n)return null;
  const result=number.toString();return match[1]+(digits[0]==='0'?result.padStart(digits.length,'0'):result);
 }
 return {valid:value=>!!parts(value),next};
});
